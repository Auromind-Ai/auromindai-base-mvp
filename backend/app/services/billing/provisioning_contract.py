import uuid
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from app.models.plan_entitlement import PlanEntitlement


class IAIBillingProvisioner(ABC):

    @abstractmethod
    def initialize(self, db: Session, workspace_id: uuid.UUID, entitlement: PlanEntitlement) -> None:
        pass


class IWCCBillingProvisioner(ABC):

    @abstractmethod
    def initialize(self, db: Session, workspace_id: uuid.UUID, entitlement: PlanEntitlement) -> None:
        pass
