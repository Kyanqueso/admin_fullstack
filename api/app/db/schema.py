from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Date, UniqueConstraint
from app.config.sqlite_config import Base
from sqlalchemy import DateTime
from datetime import datetime, timezone
from datetime import date

#Optimization: Turn Abstract?
class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    type = Column(String, nullable=False, default="client")

    __mapper_args__ = {
        "polymorphic_identity": "person",
        "polymorphic_on": type,
    }


class Admin(Person):
    __tablename__ = "admins"

    id = Column(Integer, ForeignKey("persons.id"), primary_key=True)

    firebase_uid = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True)

    __mapper_args__ = {
        "polymorphic_identity": "admin",
    }


class Client(Person):
    __tablename__ = "clients"

    id = Column(
        Integer,
        ForeignKey("persons.id"),
        autoincrement=True,
        primary_key=True
    )

    company_id = Column(Integer, ForeignKey("companies.company_id"))
    address = Column(String, nullable=True)
    viber_number = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),  # Use timezone-aware
        onupdate=lambda: datetime.now(timezone.utc),  # Auto-updates on change
    )

    __mapper_args__ = {
        "polymorphic_identity": "client",
    }


class Company(Base):
    __tablename__ = "companies"

    company_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)


class ClientOrder(Base):
    __tablename__ = "client_orders"

    client_order_id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    client_id = Column(
        Integer,
        ForeignKey("clients.id"),
        nullable=False
    )

    order_date = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    model = Column(String, nullable=False)
    size = Column(Float, nullable=False)
    material = Column(String, nullable=False)
    mold = Column(String, nullable=False)
    color = Column(String, nullable=False)
    heel_size = Column(String, nullable=False)
    heel_type = Column(String, nullable=False)

    has_platform = Column(Boolean, nullable=False)
    has_slingback = Column(Boolean, nullable=False)
    has_buckle = Column(Boolean, nullable=False)

    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)


class PaymentSummary(Base):
    __tablename__ = "payment_summaries"

    payment_summary_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    client_order_id = Column(
        Integer, ForeignKey("client_orders.client_order_id"),
        nullable=False
    )

    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, nullable=False)

    remaining_balance = Column(Float, nullable=False)
    #0 -> not cleared ->  remaining balance > 0
    #1 -> has cleared ->  remaining balance = 0
    balance_cleared = Column(Boolean, nullable=False, default=False)


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    payment_transaction_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        index=True
    )

    payment_summary_id = Column(
        Integer,
        ForeignKey("payment_summaries.payment_summary_id"),
        nullable=False
    )

    # 1st Pay/2nd Pay/3rd Pay
    payment_number = Column(
        Integer,
        nullable=False
    )

    paid_amount = Column(Float, nullable=False)

    payment_date = Column(
        Date,
        nullable=False,
        default=date.today
    )

    __table_args__ = (UniqueConstraint(
        "payment_summary_id",
        "payment_number",
        name="uq_payment_per_summary"
    ),
    )


""" NOT NEEDED SINCE ANALYTICS_SERVICE DERIVED WITH SQLCOMMANDS
class Analytics(Base):
    __tablename__ = "analytics"

    paymentSummaryId = Column(Integer, primary_key=True, index=True,autoincrement=True)

    #Aggregate remainingBalance from PaymentSummary
    totalBalance = Column(Float, nullable=False)

    #Temporarily based from balanceCleared from PaymentSummary
    #Optimize later for remainingBalance aggregation
    totalCompletedOrder = Column(String, nullable=True)

    # If balanceCleared = false -> totalPendingOrder++
    totalPendingOrder = Column(Integer, nullable=True)

    # Monthly and Annual Sales are computed per transaction
    # 1st Pay, 2nd Pay, 3rd pay counts to computation (not just completed pay)

    monthlySales = Column(Float, nullable=True)
    annualSales = Column(Float, nullable=True)
"""

""""
    #Firebase
class ShoeCatalog(Base):
    __tablename__ = "shoe_catalog"

    shoeCatalogId = Column(String, primary_key=True, index=True)

    modelName = Column(String, nullable=True)
    price = Column(Float, nullable=False)  # Double = Float?
    imageUrl = Column(String, nullable=False)
"""
