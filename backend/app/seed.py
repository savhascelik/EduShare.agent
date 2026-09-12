from datetime import datetime, timedelta
from app.database import SessionLocal, Base, engine
from app.models import School, SurplusItem, NeedRequest, AgentTask, Transfer
from app.auth import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(School).count() > 0:
            print("Database already contains schools, skipping seed.")
            return

        print("Seeding initial authentic schools and public data...")
        default_pwd = get_password_hash("Sifre123!")

        schools = [
            School(
                id="sch_kadikoy_al",
                name="Kadıköy Anadolu Lisesi",
                email="kadikoy@meb.gov.tr",
                password_hash=default_pwd,
                district="Kadıköy",
                address="Moda Caddesi No:12, Kadıköy, İstanbul",
                latitude=40.9858,
                longitude=29.0298,
                student_count=1050,
                teacher_count=65,
                classroom_count=32,
                school_type="Anadolu Lisesi",
                principal_name="Ali Yılmaz (Müdür)",
                phone="0216 336 00 50"
            ),
            School(
                id="sch_besiktas_al",
                name="Beşiktaş Atatürk Anadolu Lisesi",
                email="besiktas@meb.gov.tr",
                password_hash=default_pwd,
                district="Beşiktaş",
                address="Cihannüma Mah. Barbaros Bulvarı No:44, Beşiktaş, İstanbul",
                latitude=41.0489,
                longitude=29.0067,
                student_count=820,
                teacher_count=52,
                classroom_count=26,
                school_type="Anadolu Lisesi",
                principal_name="Fatma Demir (Müdür)",
                phone="0212 259 10 20"
            ),
            School(
                id="sch_haydarpasa_mtal",
                name="Haydarpaşa Mesleki ve Teknik Anadolu Lisesi",
                email="haydarpasa@meb.gov.tr",
                password_hash=default_pwd,
                district="Üsküdar",
                address="Selimiye Mah. Tıbbiye Cad. No:6, Üsküdar, İstanbul",
                latitude=41.0182,
                longitude=29.0223,
                student_count=1200,
                teacher_count=85,
                classroom_count=40,
                school_type="Mesleki ve Teknik Anadolu Lisesi",
                principal_name="Mehmet Öz (Müdür)",
                phone="0216 341 02 11"
            ),
            School(
                id="sch_kabatas_el",
                name="Kabataş Erkek Lisesi",
                email="kabatas@meb.gov.tr",
                password_hash=default_pwd,
                district="Beşiktaş",
                address="Ortaköy Mah. Çırağan Cad. No:40, Beşiktaş, İstanbul",
                latitude=41.0441,
                longitude=29.0272,
                student_count=940,
                teacher_count=58,
                classroom_count=30,
                school_type="Fen Lisesi Programı",
                principal_name="Hasan Çelik (Müdür)",
                phone="0212 258 50 60"
            ),
            School(
                id="sch_uskudar_akal",
                name="Üsküdar Ahmet Keleşoğlu Anadolu Lisesi",
                email="uskudar@meb.gov.tr",
                password_hash=default_pwd,
                district="Üsküdar",
                address="Altunizade Mah. Kuşbakışı Cad. No:18, Üsküdar, İstanbul",
                latitude=41.0253,
                longitude=29.0435,
                student_count=780,
                teacher_count=48,
                classroom_count=24,
                school_type="Anadolu Lisesi",
                principal_name="Zeynep Kaya (Müdür)",
                phone="0216 474 15 20"
            ),
            School(
                id="sch_maltepe_fl",
                name="Maltepe Fen Lisesi",
                email="maltepe@meb.gov.tr",
                password_hash=default_pwd,
                district="Maltepe",
                address="Cevizli Mah. Tugay Yolu Cad. No:5, Maltepe, İstanbul",
                latitude=40.9324,
                longitude=29.1387,
                student_count=620,
                teacher_count=42,
                classroom_count=20,
                school_type="Fen Lisesi",
                principal_name="Burak Şahin (Müdür)",
                phone="0216 441 33 22"
            )
        ]

        for s in schools:
            db.add(s)
        db.commit()

        # Seed Needs
        need1 = NeedRequest(
            id="need_haydarpasa_bilisim",
            school_id="sch_haydarpasa_mtal",
            title="Bilişim Laboratuvarı Masaüstü Bilgisayar İhtiyacı",
            raw_text="Meslek lisesi yazılım ve ağ atölyemizde 10 adet çalışır durumda masaüstü bilgisayara acil ihtiyaç vardır.",
            item_category="Bilişim & Bilgisayar",
            quantity_needed=10,
            urgency_level="HIGH",
            status="OPEN"
        )
        need2 = NeedRequest(
            id="need_uskudar_sira",
            school_id="sch_uskudar_akal",
            title="11. Sınıf Şubeleri İçin Öğrenci Sırası",
            raw_text="Yeni açılan iki şubemiz için sağlam, çift kişilik öğrenci sırası ve sandalye talep etmekteyiz.",
            item_category="Mobilya & Sıra",
            quantity_needed=20,
            urgency_level="MEDIUM",
            status="OPEN"
        )
        need3 = NeedRequest(
            id="need_maltepe_mikroskop",
            school_id="sch_maltepe_fl",
            title="Biyoloji Laboratuvarı İçin Optik Mikroskop",
            raw_text="TÜBİTAK ve fen projelerinde öğrencilerimizin inceleme yapabilmesi için optik mikroskop aranıyor.",
            item_category="Fen & Laboratuvar",
            quantity_needed=4,
            urgency_level="HIGH",
            status="OPEN"
        )
        db.add_all([need1, need2, need3])

        # Seed 1 completed transfer so impact counters and map arcs have real historic baseline
        transfer1 = Transfer(
            id="trf_initial_1",
            task_id="task_seed_1",
            from_school_id="sch_kadikoy_al",
            to_school_id="sch_haydarpasa_mtal",
            item_summary="15 Adet Dell Optiplex Masaüstü Bilgisayar & Monitör",
            quantity=15,
            estimated_savings_tl=185000.0,
            prevented_co2_kg=2400.0,
            status="APPROVED",
            transferred_at=datetime.utcnow() - timedelta(days=2)
        )
        transfer2 = Transfer(
            id="trf_initial_2",
            task_id="task_seed_2",
            from_school_id="sch_kabatas_el",
            to_school_id="sch_besiktas_al",
            item_summary="30 Adet Ergonomik Öğrenci Çalışma Masası",
            quantity=30,
            estimated_savings_tl=64500.0,
            prevented_co2_kg=840.0,
            status="APPROVED",
            transferred_at=datetime.utcnow() - timedelta(days=1)
        )
        db.add_all([transfer1, transfer2])

        db.commit()
        print("Database successfully seeded with realistic educational institutions!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
