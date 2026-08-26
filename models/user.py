from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class User:
    user_id: Optional[int] = None
    full_name: str = ""
    email: str = ""
    password_hash: str = ""
    role: str = "patient"
    created_at: Optional[datetime] = None

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
