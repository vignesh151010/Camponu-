from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.user import UserRole


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or Student/Staff Register Number")
    password: str = Field(..., min_length=4, description="Plaintext password")
    remember_me: bool = Field(default=False)


class StudentProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    department_id: int
    course_id: int
    semester_id: Optional[int] = None
    section_id: Optional[int] = None
    admission_year: int
    cgpa: float


class StaffProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    department_id: int
    designation: str
    qualification: Optional[str] = None
    specialization: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    register_number: Optional[str] = None
    full_name: str
    role: UserRole
    is_active: bool
    phone: Optional[str] = None
    student_profile: Optional[StudentProfileOut] = None
    staff_profile: Optional[StaffProfileOut] = None


class LoginResponse(BaseModel):
    success: bool
    message: str
    token: str
    user: UserResponse


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=4)
    new_password: str = Field(..., min_length=6)


class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(..., description="Email address or Register Number")


class ForgotPasswordResponse(BaseModel):
    success: bool
    message: str
    reset_token: Optional[str] = None  # Returned for easy testing and local demo convenience


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="One-time password reset token")
    new_password: str = Field(..., min_length=6, description="New secure password")


class ResetPasswordResponse(BaseModel):
    success: bool
    message: str


class DepartmentOption(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str


class CourseOption(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    department_id: int


class SectionOption(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    semester_id: int


class RegistrationOptionsResponse(BaseModel):
    departments: list[DepartmentOption]
    courses: list[CourseOption]
    sections: list[SectionOption]


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120, description="Full legal or campus name")
    email: EmailStr = Field(..., description="Valid personal or institutional email")
    password: str = Field(..., min_length=6, description="Minimum 6 characters password")
    role: UserRole = Field(default=UserRole.STUDENT, description="student, staff, or admin")
    register_number: Optional[str] = Field(None, max_length=50, description="Custom Roll No or Employee ID. Auto-generated if omitted.")
    phone: Optional[str] = Field(None, max_length=20)

    # Student specific fields
    department_id: Optional[int] = None
    course_id: Optional[int] = None
    section_id: Optional[int] = None
    admission_year: Optional[int] = 2026

    # Staff specific fields
    designation: Optional[str] = "Assistant Professor"
    specialization: Optional[str] = None

