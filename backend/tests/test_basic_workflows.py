import os
import sys
import uuid

import pytest
from sqlalchemy.orm import Session

from app.models.plan import Plan
from app.models.plan_entitlement import PlanEntitlement
from app.models.subscription import Subscription
from app.core.enums import SubscriptionStatus

from app.models.subscription import Subscription, SubscriptionStatus

from app.services.billing.entitlement_service import EntitlementService
from app.services.billing.entitlement_orchestrator import EntitlementOrchestrator

# ---------------------------------------------------------------------------
# Test environment
# ---------------------------------------------------------------------------

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_temp.db")
os.environ.setdefault("SECRET_KEY", "testsecret_12345678901234567890")
os.environ.setdefault(
    "ENCRYPTION_KEY",
    "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=",
)
os.environ.setdefault("ENVIRONMENT", "testing")

sys.path.insert(
    0,
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
)

# ---------------------------------------------------------------------------
# Application imports
# ---------------------------------------------------------------------------

from app.services.auth_service import AuthService
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def unique_email() -> str:
    return f"workflow_{uuid.uuid4().hex[:10]}@example.com"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def workflow_db():
    """
    Create an isolated database session for each workflow test.

    Uses the project's existing database engine/session setup
    and seeds the default billing plans and entitlements.
    """
    from app.database import SessionLocal

    db = SessionLocal()

    try:
        # Seed default plans and entitlements required by AuthService
        EntitlementService.seed_default_entitlements(db)

        yield db

    finally:
        db.rollback()
        db.close()


# ---------------------------------------------------------------------------
# P0 - Authentication Workflow
# ---------------------------------------------------------------------------

def test_user_authentication_workflow(workflow_db: Session):
    """
    P0 Authentication workflow:

        User creation
             ↓
        Email authentication
             ↓
        Access token/session generated
             ↓
        Workspace created
             ↓
        Workspace membership created

    Verify actual database state and authentication response.
    """

    email = unique_email()
    full_name = "Workflow Test User"
    workspace_name = "Workflow Test Workspace"

    # ------------------------------------------------------------------
    # 1. Create user / login through existing AuthService flow
    # ------------------------------------------------------------------

    result = AuthService.email_login(
        workflow_db,
        email=email,
        full_name=full_name,
        workspace_name=workspace_name,
    )

    assert result is not None

    # Authentication response
    assert result.get("access_token")
    assert result.get("token_type") == "bearer"
    assert result.get("csrf_token")

    # User response
    assert result.get("user")
    assert result["user"]["email"] == email
    assert result["user"]["full_name"] == full_name

    # ------------------------------------------------------------------
    # 2. Verify User exists in database
    # ------------------------------------------------------------------

    user = (
        workflow_db.query(User)
        .filter(User.email == email)
        .first()
    )

    assert user is not None
    assert user.email == email
    assert user.full_name == full_name

    # ------------------------------------------------------------------
    # 3. Verify workspace was created
    # ------------------------------------------------------------------

    workspace = (
        workflow_db.query(Workspace)
        .filter(Workspace.created_by == user.id)
        .first()
    )

    assert workspace is not None
    assert workspace.name == workspace_name
    assert workspace.created_by == user.id

    # ------------------------------------------------------------------
    # 4. Verify workspace membership
    # ------------------------------------------------------------------

    membership = (
        workflow_db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == user.id,
        )
        .first()
    )

    assert membership is not None
    assert membership.workspace_id == workspace.id
    assert membership.user_id == user.id
    assert membership.role == "founder"

    # ------------------------------------------------------------------
    # 5. Verify workspace context is returned
    # ------------------------------------------------------------------

    assert result["user"].get("id") == str(user.id)

    if result["user"].get("workspace_id"):
        assert result["user"]["workspace_id"] == str(workspace.id)

    if result.get("workspace_id"):
        assert result["workspace_id"] == str(workspace.id)


# ---------------------------------------------------------------------------
# P0 - Workspace Workflow
# ---------------------------------------------------------------------------

def test_workspace_creation_workflow(workflow_db: Session):
    """
    P0 Workspace workflow:

        Create user
             ↓
        Create workspace
             ↓
        Create membership
             ↓
        Verify ownership
             ↓
        Verify another user does not own/access the workspace
    """

    owner_email = unique_email()
    owner_name = "Workspace Owner"
    workspace_name = "Owner Workspace"

    # ------------------------------------------------------------------
    # 1. Create owner + workspace
    # ------------------------------------------------------------------

    result = AuthService.email_login(
        workflow_db,
        email=owner_email,
        full_name=owner_name,
        workspace_name=workspace_name,
    )

    assert result is not None
    assert result.get("access_token")

    # ------------------------------------------------------------------
    # 2. Verify owner exists
    # ------------------------------------------------------------------

    owner = (
        workflow_db.query(User)
        .filter(User.email == owner_email)
        .first()
    )

    assert owner is not None
    assert owner.full_name == owner_name

    # ------------------------------------------------------------------
    # 3. Verify workspace exists
    # ------------------------------------------------------------------

    workspace = (
        workflow_db.query(Workspace)
        .filter(
            Workspace.created_by == owner.id,
            Workspace.name == workspace_name,
        )
        .first()
    )

    assert workspace is not None
    assert workspace.created_by == owner.id
    assert workspace.name == workspace_name

    # ------------------------------------------------------------------
    # 4. Verify owner membership
    # ------------------------------------------------------------------

    owner_membership = (
        workflow_db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == owner.id,
        )
        .first()
    )

    assert owner_membership is not None
    assert owner_membership.role == "founder"

    # ------------------------------------------------------------------
    # 5. Create another independent user
    # ------------------------------------------------------------------

    other_email = unique_email()

    other_result = AuthService.email_login(
        workflow_db,
        email=other_email,
        full_name="Other User",
        workspace_name="Other Workspace",
    )

    assert other_result is not None
    assert other_result.get("access_token")

    other_user = (
        workflow_db.query(User)
        .filter(User.email == other_email)
        .first()
    )

    assert other_user is not None
    assert other_user.id != owner.id

    # ------------------------------------------------------------------
    # 6. Verify other user is NOT a member of owner's workspace
    # ------------------------------------------------------------------

    other_membership = (
        workflow_db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == other_user.id,
        )
        .first()
    )

    assert other_membership is None

    # ------------------------------------------------------------------
    # 7. Verify workspace ownership remains with original owner
    # ------------------------------------------------------------------

    refreshed_workspace = (
        workflow_db.query(Workspace)
        .filter(Workspace.id == workspace.id)
        .first()
    )

    assert refreshed_workspace is not None
    assert refreshed_workspace.created_by == owner.id

def test_subscription_assignment_workflow(workflow_db: Session):
    """
    P0 Subscription / Entitlement workflow:

        User
          ↓
        Workspace
          ↓
        Create Subscription
          ↓
        Subscription activated
          ↓
        Verify subscription
          ↓
        Verify workspace entitlement
    """

    email = unique_email()

    # ---------------------------------------------------------------
    # 1. Create user + workspace
    # ---------------------------------------------------------------

    auth_result = AuthService.email_login(
        workflow_db,
        email=email,
        full_name="Subscription Workflow User",
        workspace_name="Subscription Workflow Workspace",
    )

    assert auth_result is not None
    assert auth_result.get("access_token")

    user = (
        workflow_db.query(User)
        .filter(User.email == email)
        .first()
    )

    assert user is not None

    workspace = (
        workflow_db.query(Workspace)
        .filter(Workspace.created_by == user.id)
        .first()
    )

    assert workspace is not None

    # ---------------------------------------------------------------
    # 2. Find Pro plan
    # ---------------------------------------------------------------

    pro_plan = (
        workflow_db.query(Plan)
        .filter(Plan.name == "pro")
        .first()
    )

    assert pro_plan is not None

    # ---------------------------------------------------------------
    # 3. Verify Pro entitlement exists
    # ---------------------------------------------------------------

    entitlement = (
        workflow_db.query(PlanEntitlement)
        .filter(
            PlanEntitlement.plan_id == pro_plan.id
        )
        .first()
    )

    assert entitlement is not None
    assert entitlement.plan_id == pro_plan.id

    # ---------------------------------------------------------------
    # 4. Create subscription directly in test DB
    #
    # This verifies the business state without calling Razorpay.
    # External payment provider is intentionally not called.
    # ---------------------------------------------------------------

    EntitlementOrchestrator.upgrade_subscription(
    workflow_db,
    workspace.id,
    pro_plan.id,
)

    workflow_db.commit()

    subscription = (
    workflow_db.query(Subscription)
    .filter(
        Subscription.workspace_id == workspace.id,
        Subscription.plan_id == pro_plan.id,
        Subscription.status == SubscriptionStatus.active,
    )
    .first()
)

    assert subscription is not None

    saved_subscription = (
    workflow_db.query(Subscription)
    .filter(
        Subscription.id == subscription.id
    )
    .first()
)

    assert saved_subscription is not None
    assert saved_subscription.workspace_id == workspace.id
    assert saved_subscription.plan_id == pro_plan.id
    assert saved_subscription.status == SubscriptionStatus.active
    assert saved_subscription.provider_subscription_id is not None

    # ---------------------------------------------------------------
    # 6. Verify workspace → plan relationship
    # ---------------------------------------------------------------

    workspace_subscription = (
        workflow_db.query(Subscription)
        .filter(
            Subscription.workspace_id == workspace.id,
            Subscription.status == SubscriptionStatus.active,
        )
        .first()
    )

    assert workspace_subscription is not None
    assert workspace_subscription.plan_id == pro_plan.id

    # ---------------------------------------------------------------
    # 7. Final business-state assertions
    # ---------------------------------------------------------------

    assert str(workspace_subscription.workspace_id) == str(workspace.id)
    assert str(workspace_subscription.plan_id) == str(pro_plan.id)
