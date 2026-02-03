from .base import Base
from sqlalchemy import ForeignKey, UniqueConstraint, Column, Integer, String, Numeric, Boolean, Date, DateTime
from sqlalchemy.orm import relationship
from datetime import date, datetime, timezone


class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=True)

    clients = relationship("Client", back_populates="company", cascade="all, delete-orphan")


# Superclass for Admin and Client
class Person(Base):
    __tablename__ = "persons"
    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(30), nullable=False)
    last_name = Column(String(30), nullable=False)
    role = Column(String(10), nullable=False)

    __mapper_args__ = {
        "polymorphic_on": role
    }


class Admin(Person):
    __tablename__ = "admins"
    id = Column(Integer, ForeignKey("persons.id"), primary_key=True)
    __mapper_args__ = {
        "polymorphic_identity": "admin"
    }


class Client(Person):
    __tablename__ = "clients"
    id = Column(Integer, ForeignKey("persons.id"), primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    address = Column(String(255), nullable=True)
    viber_number = Column(String(15), nullable=False)
    notes = Column(String(255), nullable=True)
    __mapper_args__ = {
        "polymorphic_identity": "client"
    }

    company = relationship("Company", back_populates="clients")
    client_orders = relationship("ClientOrder", back_populates="client")


class ClientOrder(Base):
    __tablename__ = "client_orders"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    order_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    model = Column(String(50), nullable=False)
    size = Column(Numeric(4, 2), nullable=False)
    material = Column(String(20), nullable=False)
    color = Column(String(20), nullable=False)
    mold = Column(String(20), nullable=False)
    heel_size = Column(Numeric(10, 2), nullable=False)
    heel_type = Column(String(5), nullable=False, default="h1")
    has_platform = Column(Boolean, nullable=False, default=False)
    has_slingback = Column(Boolean, nullable=False, default=False)
    has_buckle = Column(Boolean, nullable=False, default=False)
    quantity = Column(Integer, nullable=False, default=1)
    price = Column(Numeric(10, 2), nullable=False)

    client = relationship("Client", back_populates="client_orders")
    payment_summary = relationship("PaymentSummary", back_populates="client_order", uselist=False)


class PaymentSummary(Base):
    __tablename__ = "payment_summaries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    client_order_id = Column(Integer, ForeignKey("client_orders.id"), nullable=False)
    paid_amount = Column(Numeric(10, 2), nullable=False, default=0)
    remaining_balance = Column(Numeric(10, 2), nullable=False)

    client_order = relationship("ClientOrder", back_populates="payment_summary")
    payment_transactions = relationship("PaymentTransaction", back_populates="payment_summary")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    payment_summary_id = Column(Integer, ForeignKey("payment_summaries.id"), nullable=False)
    payment_number = Column(Integer, nullable=False)  # 1st pay/2nd pay/3rd pay
    paid_amount = Column(Numeric(10, 2), nullable=False)
    payment_date = Column(Date, nullable=False, default=date.today)

    __table_args__ = (
        UniqueConstraint(
            "payment_summary_id",
            "payment_number",
            name="uq_payment_per_summary"
        ),
    )

    payment_summary = relationship("PaymentSummary", back_populates="payment_transactions")

# Relationships
# Analytics class not needed since it is derived
# ShoeCatalog is for Firebase later on
