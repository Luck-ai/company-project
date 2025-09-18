from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Content
import os
from typing import Optional

router = APIRouter(prefix="/email", tags=["email"])


def get_sendgrid_api_key():
    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="SendGrid API key not set")
    return api_key

def send_verification_email_sync(email: str, link: Optional[str] = None, full_name: Optional[str] = None, api_key: Optional[str] = None):

    if api_key is None:
        api_key = get_sendgrid_api_key()

    full_name = full_name or ''

    message = Mail(
        from_email="luckyagarwal645@gmail.com",
        to_emails=email,
        subject="Please verify your email",
    )
    message.template_id = 'd-47dfabf4ba1d4b5b98a4a582fc5973d9'
    message.dynamic_template_data = {
        'full_name': full_name,
        'verify_link': link
    }

    sg = SendGridAPIClient(api_key)
    response = sg.send(message)
    return response

