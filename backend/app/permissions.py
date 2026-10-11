"""Organization context and role checks for API routes.

Every organization-scoped request carries an `X-Organization-Id` header. These dependencies
resolve it to the caller's membership in that organization and enforce the role it needs.
"""
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from . import models
from .database import get_db
from .security import get_current_user


def get_current_membership(
    x_organization_id: UUID | None = Header(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.Membership:
    """The current user's membership in the organization named by the X-Organization-Id header."""
    if x_organization_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X-Organization-Id header is required")
    membership = (
        db.query(models.Membership)
        .filter(
            models.Membership.user_id == current_user.id,
            models.Membership.organization_id == x_organization_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this organization")
    return membership


def require_roles(*roles: str):
    """Dependency factory: the caller's membership, provided its role is one of `roles`."""

    def dependency(membership: models.Membership = Depends(get_current_membership)) -> models.Membership:
        if membership.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your role does not allow this action")
        return membership

    return dependency


require_staff = require_roles(*models.STAFF_ROLES)
require_manager = require_roles(*models.MANAGER_ROLES)
require_candidate = require_roles(models.ROLE_CANDIDATE)
