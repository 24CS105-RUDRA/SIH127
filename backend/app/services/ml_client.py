import httpx
from typing import Optional, List, Dict, Any
from app.schemas.sighting import SightingCreate
from app.core.config import settings


class MLServiceClient:
    def __init__(self):
        self.base_url = settings.ML_SERVICE_URL
        self.client = httpx.AsyncClient(timeout=30.0)

    async def detect_plates(self, image_base64: str, camera_id: str) -> List[Dict[str, Any]]:
        """Send image to ML service for plate detection"""
        try:
            response = await self.client.post(
                f"{self.base_url}/detect",
                json={
                    "image": image_base64,
                    "camera_id": camera_id
                }
            )
            response.raise_for_status()
            return response.json().get("detections", [])
        except Exception as e:
            print(f"ML service error: {e}")
            return []

    async def detect_batch(self, images: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Send batch of images to ML service"""
        try:
            response = await self.client.post(
                f"{self.base_url}/detect/batch",
                json={"images": images}
            )
            response.raise_for_status()
            return response.json().get("results", [])
        except Exception as e:
            print(f"ML service batch error: {e}")
            return []

    async def health_check(self) -> bool:
        """Check if ML service is healthy"""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            return response.status_code == 200
        except Exception:
            return False

    async def close(self):
        await self.client.aclose()