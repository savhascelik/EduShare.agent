#!/usr/bin/env python3
"""
EduShare Autonomous AWS Cloud Deployment Script
Deploys EduShare on AWS EC2 using Docker Compose (Option A).
"""
import os
import sys
import time
import base64
import boto3
from botocore.exceptions import ClientError

REGION = "us-east-1"
INSTANCE_TYPE = "t3.medium" # 2 vCPU, 4GB RAM (Ideal for Docker builds & real-time SSE)
KEY_NAME = "edushare-key-2026"
SG_NAME = "edushare-security-group"

def main():
    print("=" * 60)
    print("🚀 EduShare AWS Autonomous Cloud Deployment (Option A)")
    print("=" * 60)

    # 1. AWS Session and Credentials
    session = boto3.Session(region_name=REGION)
    creds = session.get_credentials()
    if not creds:
        print("❌ Error: Could not load AWS credentials from environment or ~/.aws/credentials")
        sys.exit(1)

    sts = session.client("sts")
    identity = sts.get_caller_identity()
    print(f"✅ Authenticated AWS Account: {identity['Account']} (ARN: {identity['Arn']})")
    print(f"📍 AWS Deployment Region: {REGION}")

    ec2 = session.client("ec2")

    # 2. Find Default VPC
    vpcs = ec2.describe_vpcs(Filters=[{"Name": "isDefault", "Values": ["true"]}])
    if not vpcs["Vpcs"]:
        vpcs = ec2.describe_vpcs()
    if not vpcs["Vpcs"]:
        print("❌ Error: No VPC found in region", REGION)
        sys.exit(1)
    vpc_id = vpcs["Vpcs"][0]["VpcId"]
    print(f"✅ Target VPC: {vpc_id}")

    # 3. Create or Get Security Group
    sg_id = None
    try:
        sgs = ec2.describe_security_groups(Filters=[
            {"Name": "group-name", "Values": [SG_NAME]},
            {"Name": "vpc-id", "Values": [vpc_id]}
        ])
        if sgs["SecurityGroups"]:
            sg_id = sgs["SecurityGroups"][0]["GroupId"]
            print(f"✅ Found existing Security Group: {sg_id} ({SG_NAME})")
        else:
            sg = ec2.create_security_group(
                GroupName=SG_NAME,
                Description="EduShare Production Security Group (HTTP, HTTPS, SSH)",
                VpcId=vpc_id
            )
            sg_id = sg["GroupId"]
            print(f"✅ Created Security Group: {sg_id}")

            # Authorize Inbound Rules
            ec2.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[
                    {
                        "IpProtocol": "tcp",
                        "FromPort": 80,
                        "ToPort": 80,
                        "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "EduShare Web HTTP"}]
                    },
                    {
                        "IpProtocol": "tcp",
                        "FromPort": 443,
                        "ToPort": 443,
                        "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "EduShare Web HTTPS"}]
                    },
                    {
                        "IpProtocol": "tcp",
                        "FromPort": 22,
                        "ToPort": 22,
                        "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "SSH Remote Admin"}]
                    }
                ]
            )
            print("✅ Inbound rules added (Port 80 HTTP, 443 HTTPS, 22 SSH)")
    except ClientError as e:
        if "InvalidGroup.Duplicate" in str(e):
            sgs = ec2.describe_security_groups(GroupNames=[SG_NAME])
            sg_id = sgs["SecurityGroups"][0]["GroupId"]
        else:
            print("⚠️ SG Info:", e)

    # 4. Create or Locate Key Pair
    key_pem_path = os.path.join(os.path.dirname(__file__), f"{KEY_NAME}.pem")
    try:
        existing_keys = ec2.describe_key_pairs(Filters=[{"Name": "key-name", "Values": [KEY_NAME]}])
        if existing_keys["KeyPairs"]:
            print(f"✅ Key Pair exists: {KEY_NAME}")
        else:
            kp = ec2.create_key_pair(KeyName=KEY_NAME)
            with open(key_pem_path, "w") as f:
                f.write(kp["KeyMaterial"])
            print(f"✅ Created new Key Pair: {KEY_NAME} (Saved to {key_pem_path})")
    except Exception as e:
        print(f"⚠️ Key Pair Note: {e}")

    # 5. Find Latest Ubuntu 24.04 LTS AMI
    ami_resp = ec2.describe_images(
        Owners=["099720109477"], # Canonical
        Filters=[
            {"Name": "name", "Values": ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]},
            {"Name": "state", "Values": ["available"]}
        ]
    )
    sorted_images = sorted(ami_resp["Images"], key=lambda x: x["CreationDate"], reverse=True)
    if not sorted_images:
        print("❌ Could not locate Ubuntu 24.04 AMI")
        sys.exit(1)
    ami_id = sorted_images[0]["ImageId"]
    ami_name = sorted_images[0]["Name"]
    print(f"✅ Selected Base AMI: {ami_id} ({ami_name})")

    # 6. Prepare UserData (Cloud-Init) Script
    user_data_script = f"""#!/bin/bash
set -e
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "========================================="
echo "EduShare Automated Deployment Started"
echo "========================================="

# Update package lists
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

# Install Docker CE & Compose Plugin
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

# Clone repository
mkdir -p /opt/edushare
cd /opt/edushare
git clone https://github.com/savhascelik/EduShare.agent.git .

# Create production .env file
cat << 'EOF' > .env
POSTGRES_USER=edushare_user
POSTGRES_PASSWORD=edushare_secure_pass_2026
POSTGRES_DB=edushare_db
DATABASE_URL=postgresql://edushare_user:edushare_secure_pass_2026@postgres:5432/edushare_db
AWS_DEFAULT_REGION={REGION}
AWS_ACCESS_KEY_ID={creds.access_key}
AWS_SECRET_ACCESS_KEY={creds.secret_key}
BEDROCK_MODEL_ID=us.amazon.nova-pro-v1:0
JWT_SECRET=meb_edushare_super_secret_jwt_key_2026
EOF

# Build and start services
docker compose -f docker-compose.prod.yml up -d --build

echo "========================================="
echo "EduShare Autonomous Deployment Finished!"
echo "========================================="
"""

    encoded_user_data = base64.b64encode(user_data_script.encode("utf-8")).decode("utf-8")

    # 7. Launch Instance
    print(f"📦 Launching EC2 instance ({INSTANCE_TYPE}) with 20GB gp3 SSD...")
    run_args = {
        "ImageId": ami_id,
        "InstanceType": INSTANCE_TYPE,
        "KeyName": KEY_NAME,
        "SecurityGroupIds": [sg_id],
        "UserData": user_data_script,
        "MinCount": 1,
        "MaxCount": 1,
        "BlockDeviceMappings": [
            {
                "DeviceName": "/dev/sda1",
                "Ebs": {
                    "VolumeSize": 20,
                    "VolumeType": "gp3",
                    "DeleteOnTermination": True
                }
            }
        ],
        "TagSpecifications": [
            {
                "ResourceType": "instance",
                "Tags": [
                    {"Key": "Name", "Value": "EduShare-Production-Agent"},
                    {"Key": "Project", "Value": "EduShare"},
                    {"Key": "Hackathon", "Value": "Agents-for-Humans-2026"}
                ]
            }
        ]
    }

    resp = ec2.run_instances(**run_args)
    instance_id = resp["Instances"][0]["InstanceId"]
    print(f"✅ Instance created with ID: {instance_id}")

    # 8. Wait for Instance Running and Retrieve Public IP
    print("⏳ Waiting for instance to transition to RUNNING state...")
    waiter = ec2.get_waiter("instance_running")
    waiter.wait(InstanceIds=[instance_id])

    desc = ec2.describe_instances(InstanceIds=[instance_id])
    inst = desc["Reservations"][0]["Instances"][0]
    public_ip = inst.get("PublicIpAddress", "N/A")
    public_dns = inst.get("PublicDnsName", "N/A")

    print("\n" + "=" * 60)
    print("🎉 EDUSHARE AWS DEPLOYMENT LAUNCHED SUCCESSFULLY!")
    print("=" * 60)
    print(f"📍 Instance ID:  {instance_id}")
    print(f"📍 Public IPv4:  {public_ip}")
    print(f"📍 Public DNS:   {public_dns}")
    print(f"🌐 Application URL: http://{public_ip}")
    print("-" * 60)
    print("⏱️ Cloud-Init is currently installing Docker and building the containers.")
    print("   The web application will be fully live and accessible at:")
    print(f"   👉 http://{public_ip}")
    print("   (Takes approximately 2-3 minutes for initial Docker build).")
    print("-" * 60)
    print(f"🔑 SSH Login: ssh -i {key_pem_path} ubuntu@{public_ip}")
    print("   Log monitoring: ssh -i ... 'tail -f /var/log/user-data.log'")
    print("=" * 60 + "\n")

    # Save details to deployment.json
    with open("deployment.json", "w") as f:
        import json
        json.dump({
            "instance_id": instance_id,
            "public_ip": public_ip,
            "public_dns": public_dns,
            "url": f"http://{public_ip}",
            "deployed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }, f, indent=2)

if __name__ == "__main__":
    main()
