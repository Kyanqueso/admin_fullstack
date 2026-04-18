#!/usr/bin/env python3
"""
Database seeder for Theresa Shoes.

Usage (run from the api/ directory):
    python seed.py small    # 5 companies, 25 clients, ~50-75 orders
    python seed.py large    # 15 companies, 100 clients, ~200-300 orders
    python seed.py clear    # remove all companies/clients/orders/payments (keeps admins + shoe_catalog)
"""

import sys
import random
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP

from dotenv import load_dotenv
load_dotenv()

from app.config.database import SessionLocal
from app.db.models import (
    Company, Person, Client, ClientOrder,
    PaymentSummary, PaymentTransaction,
)


# ─────────────────────────────────────────────────────────────────
#  STATIC DATA POOLS
# ─────────────────────────────────────────────────────────────────

FIRST_NAMES = [
    "Maria", "Jose", "Ana", "Juan", "Rosa", "Pedro", "Carmen",
    "Antonio", "Lourdes", "Eduardo", "Marilou", "Ricardo",
    "Cristina", "Fernando", "Teresita", "Manuel", "Rowena",
    "Emmanuel", "Maricel", "Roberto", "Gemma", "Danilo",
    "Evelyn", "Ronaldo", "Corazon", "Arnel", "Sheila",
    "Renato", "Jocelyn", "Virgilio", "Nenita", "Rodel",
    "Ligaya", "Dindo", "Meriam", "Efren", "Cecille",
]

LAST_NAMES = [
    "Santos", "Reyes", "Cruz", "Garcia", "Gonzales", "Flores",
    "Ramos", "Mendoza", "Torres", "Bautista", "Villanueva",
    "Aquino", "Castillo", "dela Cruz", "Hernandez", "Lagman",
    "Uy", "Lim", "Tan", "Sy", "Dizon", "Padilla", "Soriano",
    "Magno", "Cunanan", "Manalo", "Salazar", "Aguilar", "Ocampo",
    "Domingo", "Pascual", "Tolentino", "Valdez", "Villafuerte",
]

COMPANY_BASES = [
    "Dela Cruz", "Santos", "Reyes", "Garcia", "Villanueva",
    "Aquino", "Bautista", "Mendoza", "Flores", "Torres",
    "Lim", "Tan", "Uy", "Castro", "Magno", "Soriano",
    "Padilla", "Aguilar", "Salazar", "Ocampo",
]

COMPANY_SUFFIXES = [
    "Enterprises", "Trading Co.", "General Merchandise",
    "Footwear", "Fashion House", "Boutique",
    "Supply & Distribution", "Collections", "Shoe Store",
    "& Associates",
]

STREETS = [
    "Rizal Street", "Mabini Street", "Bonifacio Avenue",
    "Quezon Boulevard", "MacArthur Highway", "Osmena Street",
    "Luna Street", "Del Pilar Street", "Magsaysay Avenue",
    "Aguinaldo Street", "P. Burgos Street", "Abad Santos Street",
    "Lapu-Lapu Street", "Colon Street", "Magallanes Drive",
]

BARANGAYS = [
    "Brgy. San Antonio", "Brgy. Santo Nino", "Brgy. Poblacion",
    "Brgy. San Jose", "Brgy. Bagong Lipunan", "Brgy. Magsaysay",
    "Brgy. Rizal", "Brgy. Camarin", "Brgy. Pinyahan",
    "Brgy. Commonwealth", "Brgy. Guadalupe", "Brgy. Mabolo",
    "Brgy. Lahug", "Brgy. Talamban", "Brgy. Mandaue",
]

# (City, Province)
CITIES = [
    ("Cebu City", "Cebu"),
    ("Davao City", "Davao del Sur"),
    ("Quezon City", "Metro Manila"),
    ("Manila", "Metro Manila"),
    ("Iloilo City", "Iloilo"),
    ("Cagayan de Oro", "Misamis Oriental"),
    ("Bacolod City", "Negros Occidental"),
    ("General Santos City", "South Cotabato"),
    ("Pasig City", "Metro Manila"),
    ("Taguig City", "Metro Manila"),
    ("Makati City", "Metro Manila"),
    ("Caloocan City", "Metro Manila"),
    ("Zamboanga City", "Zamboanga del Sur"),
]

# ── Shoe specs (per user requirements) ──
STYLES      = [f"Style{i}" for i in range(1, 21)]          # Style1 … Style20
MATERIALS   = ["Helga", "Tanya", "Patent", "SnakeSkin"]
HEEL_TYPES  = ["cuban", "putol", "wedge", "cone", "contessa"]
MOLD_TYPES  = ["milani", "ferage", "liz", "square"]
HEEL_SIZES  = ['1"', '1.5"', '2"', '2.5"', '3"', '3.5"', '4"']
COLORS      = ["Black", "White", "Nude", "Red", "Navy", "Brown", "Beige", "Pink", "Gold", "Silver"]
SIZES       = [Decimal(str(s)) for s in [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0]]

# Mobile network prefixes (Globe, Smart, DITO, Sun)
PH_PREFIXES = [
    "0917", "0918", "0919", "0920", "0927", "0928", "0929",
    "0930", "0932", "0933", "0935", "0936", "0939", "0942",
    "0947", "0948", "0949", "0951", "0961", "0963", "0966",
    "0967", "0977", "0994", "0995", "0996", "0997", "0998", "0999",
]


# ─────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────

def random_phone(used: set) -> str:
    """Unique 11-digit PH mobile number."""
    for _ in range(10_000):
        prefix = random.choice(PH_PREFIXES)
        digits = "".join(str(random.randint(0, 9)) for _ in range(7))
        number = prefix + digits
        if number not in used:
            used.add(number)
            return number
    raise RuntimeError("Could not generate a unique phone number — pool exhausted")


def random_address() -> str:
    house = random.randint(1, 999)
    street = random.choice(STREETS)
    barangay = random.choice(BARANGAYS)
    city, province = random.choice(CITIES)
    return f"{house} {street}, {barangay}, {city}, {province}"


def random_price() -> Decimal:
    """₱800–₱3500 in steps of 50."""
    return Decimal(str(random.randrange(800, 3550, 50)))


def past_datetime(max_days: int = 400) -> datetime:
    delta = timedelta(days=random.randint(0, max_days))
    return datetime.now(timezone.utc) - delta


def two_decimal(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ─────────────────────────────────────────────────────────────────
#  SEED
# ─────────────────────────────────────────────────────────────────

def seed(size: str):
    num_companies = 5  if size == "small" else 15
    num_clients   = 25 if size == "small" else 100

    db = SessionLocal()
    try:
        print(f"\n[seed:{size}] Starting...")

        # ── Companies ──────────────────────────────────────────
        companies = []
        used_names: set[str] = set()
        for _ in range(num_companies):
            for _ in range(1_000):
                name = f"{random.choice(COMPANY_BASES)} {random.choice(COMPANY_SUFFIXES)}"
                if name not in used_names:
                    used_names.add(name)
                    break
            company = Company(name=name)
            db.add(company)
            companies.append(company)

        db.flush()
        print(f"[seed:{size}]   {len(companies)} companies")

        # ── Clients ────────────────────────────────────────────
        # Distribute clients evenly across companies
        clients = []
        used_phones: set[str] = set()
        company_cycle = [companies[i % len(companies)].id for i in range(num_clients)]
        random.shuffle(company_cycle)

        for i in range(num_clients):
            client = Client(
                first_name=random.choice(FIRST_NAMES),
                last_name=random.choice(LAST_NAMES),
                role="client",
                company_id=company_cycle[i],
                address=random_address(),
                viber_number=random_phone(used_phones),
            )
            db.add(client)
            clients.append(client)

        db.flush()
        print(f"[seed:{size}]   {len(clients)} clients")

        # ── Orders + Payments ──────────────────────────────────
        order_count = summary_count = txn_count = 0

        for client in clients:
            num_orders = random.randint(1, 3)

            for _ in range(num_orders):
                price = random_price()
                qty   = random.randint(1, 5)
                total = two_decimal(price * qty)

                order_dt = past_datetime(400)

                # Status distribution: 50% active, 30% completed, 20% archived
                roll = random.random()
                is_completed = roll > 0.50
                is_deleted   = (roll <= 0.20)   # ~20 % archived (not completed)

                date_completed = None
                if is_completed:
                    offset = timedelta(days=random.randint(14, 120))
                    dt = order_dt + offset
                    now = datetime.now(timezone.utc)
                    date_completed = dt if dt < now else now

                order = ClientOrder(
                    client_id    = client.id,
                    order_date   = order_dt,
                    model        = random.choice(STYLES),
                    size         = random.choice(SIZES),
                    material     = random.choice(MATERIALS),
                    color        = random.choice(COLORS),
                    mold         = random.choice(MOLD_TYPES),
                    heel_size    = random.choice(HEEL_SIZES),
                    heel_type    = random.choice(HEEL_TYPES),
                    has_platform = random.random() < 0.3,
                    has_slingback= random.random() < 0.3,
                    has_buckle   = random.random() < 0.3,
                    quantity     = qty,
                    price        = price,
                    isCompleted  = is_completed,
                    dateCompleted= date_completed,
                    isDeleted    = is_deleted,
                    is_zero_balance = is_completed,   # completed = fully paid
                )
                db.add(order)
                db.flush()
                order_count += 1

                # ── Payment amounts ──
                if is_completed:
                    # Fully paid — 1 or 2 transactions that sum to total
                    paid = total
                    remaining = Decimal("0.00")
                    if random.random() < 0.5:
                        txn_amounts = [total]
                    else:
                        split = two_decimal(total * Decimal(str(round(random.uniform(0.3, 0.7), 2))))
                        txn_amounts = [split, two_decimal(total - split)]
                else:
                    pay_roll = random.random()
                    if pay_roll < 0.30:
                        # Unpaid
                        paid = Decimal("0.00")
                        txn_amounts = []
                    elif pay_roll < 0.70:
                        # Partial — one payment
                        paid = two_decimal(total * Decimal(str(round(random.uniform(0.2, 0.8), 2))))
                        txn_amounts = [paid]
                    else:
                        # Fully paid — 1 or 2 payments
                        paid = total
                        if random.random() < 0.5:
                            txn_amounts = [total]
                        else:
                            split = two_decimal(total * Decimal(str(round(random.uniform(0.3, 0.7), 2))))
                            txn_amounts = [split, two_decimal(total - split)]
                    remaining = two_decimal(total - paid)

                if is_completed:
                    remaining = Decimal("0.00")

                summary = PaymentSummary(
                    client_order_id  = order.id,
                    paid_amount      = paid,
                    remaining_balance= remaining,
                    isDeleted        = is_deleted,   # mirrors order archive state
                )
                db.add(summary)
                db.flush()
                summary_count += 1

                # ── Transactions ──
                base_date = order_dt.date()
                for idx, amount in enumerate(txn_amounts, start=1):
                    txn_date = base_date + timedelta(days=random.randint(0, 45))
                    if txn_date > date.today():
                        txn_date = date.today()
                    db.add(PaymentTransaction(
                        payment_summary_id = summary.id,
                        payment_number     = idx,
                        paid_amount        = amount,
                        payment_date       = txn_date,
                    ))
                    txn_count += 1

        db.commit()
        print(f"[seed:{size}]   {order_count} orders")
        print(f"[seed:{size}]   {summary_count} payment summaries")
        print(f"[seed:{size}]   {txn_count} payment transactions")
        print(f"[seed:{size}] Done.\n")

    except Exception as exc:
        db.rollback()
        print(f"[seed:{size}] ERROR — rolled back. {exc}")
        raise
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────
#  CLEAR
# ─────────────────────────────────────────────────────────────────

def clear():
    db = SessionLocal()
    try:
        print("\n[clear] Clearing seeded data...")

        # Delete in FK-safe order
        txn_count = db.query(PaymentTransaction).delete(synchronize_session=False)
        print(f"[clear]   {txn_count} payment transactions deleted")

        sum_count = db.query(PaymentSummary).delete(synchronize_session=False)
        print(f"[clear]   {sum_count} payment summaries deleted")

        ord_count = db.query(ClientOrder).delete(synchronize_session=False)
        print(f"[clear]   {ord_count} orders deleted")

        # Clients: joined-table inheritance — delete clients table then orphaned persons rows
        client_ids = [row.id for row in db.query(Client.id).all()]
        cli_count  = db.query(Client).delete(synchronize_session=False)
        if client_ids:
            db.query(Person).filter(
                Person.id.in_(client_ids),
                Person.role == "client"
            ).delete(synchronize_session=False)
        print(f"[clear]   {cli_count} clients deleted")

        comp_count = db.query(Company).delete(synchronize_session=False)
        print(f"[clear]   {comp_count} companies deleted")

        db.commit()
        print("[clear] Done. Admins and shoe catalog are untouched.\n")

    except Exception as exc:
        db.rollback()
        print(f"[clear] ERROR — rolled back. {exc}")
        raise
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    valid = ("small", "large", "clear")
    if len(sys.argv) != 2 or sys.argv[1] not in valid:
        print("Usage: python seed.py [small | large | clear]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "clear":
        clear()
    else:
        seed(cmd)
