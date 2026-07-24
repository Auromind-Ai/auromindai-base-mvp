import os
import sys

# Add backend root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services.platform_settings_service import get_setting
from app.services.billing.gateway.razorpay import RazorpayGateway

def main():
    print("=== Testing Razorpay Seeding & Integration ===")
    
    db = SessionLocal()
    try:
        # Check database settings
        rzp_key = get_setting(db, "razorpay_key")
        rzp_secret = get_setting(db, "razorpay_secret")
        
        print(f"Database Razorpay Key: {rzp_key}")
        print(f"Database Razorpay Secret Configured: {bool(rzp_secret)}")
        
        if not rzp_key or not rzp_secret:
            print("ERROR: Razorpay key or secret is missing from database settings.")
            return
            
        # Instantiate gateway
        print("Initializing Razorpay gateway from database configurations...")
        gateway = RazorpayGateway.from_env()
        print("Razorpay client successfully initialized!")
        
        # Test Order Creation (100 paise = Rs 1)
        print("Testing order creation for 100 paise (₹1)...")
        order = gateway.client.order.create({
            "amount": 100,
            "currency": "INR",
            "receipt": "test_receipt_123"
        })
        print(f"Success! Created Order: {order['id']} (Amount: {order['amount']} {order['currency']})")
        
        # Test Signature Verification
        print("Testing signature verification algorithm...")
        order_id = "order_IEIaJdis1t4u73"
        payment_id = "pay_IEIawwdf9813kf"
        
        # Generate valid signature
        import hmac, hashlib
        msg = f"{order_id}|{payment_id}".encode()
        expected_sig = hmac.new(rzp_secret.encode(), msg, hashlib.sha256).hexdigest()
        
        # Verify using client utility
        gateway.client.utility.verify_payment_signature({
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': expected_sig
        })
        print("Signature verification successful!")
        
    except Exception as e:
        print(f"ERROR encountered: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
