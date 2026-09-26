import os
import sys
import asyncio
import random
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any
import httpx
from faker import Faker

# Add seed to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'seed'))
from demo_plates import DEMO_PLATES, CAMERA_LOCATIONS, CAMERA_ZONES

fake = Faker()

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")
SIMULATION_SPEED = float(os.getenv("SIMULATION_SPEED", "10"))
CAMERA_COUNT = int(os.getenv("CAMERA_COUNT", "12"))

# Indian state codes for realistic plates
STATE_CODES = [
    'AP', 'AR', 'AS', 'BR', 'CG', 'GA', 'GJ', 'HR', 'HP', 'JH',
    'KA', 'KL', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OD', 'PB',
    'RJ', 'SK', 'TN', 'TS', 'TR', 'UP', 'UK', 'WB', 'AN', 'CH',
    'DN', 'DD', 'DL', 'JK', 'LA', 'LD', 'PY'
]

# Camera network topology (which cameras connect to which)
CAMERA_CONNECTIONS = {
    'CAM001': ['CAM002', 'CAM003'],
    'CAM002': ['CAM001', 'CAM004'],
    'CAM003': ['CAM001', 'CAM005', 'CAM007'],
    'CAM004': ['CAM002', 'CAM006', 'CAM008'],
    'CAM005': ['CAM003', 'CAM009'],
    'CAM006': ['CAM004', 'CAM010'],
    'CAM007': ['CAM003', 'CAM011'],
    'CAM008': ['CAM004', 'CAM012'],
    'CAM009': ['CAM005'],
    'CAM010': ['CAM006'],
    'CAM011': ['CAM007'],
    'CAM012': ['CAM008'],
}

class TrafficSimulator:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0, base_url=BACKEND_URL)
        self.active_vehicles: Dict[str, Dict] = {}  # plate -> {current_camera, path, next_move_time}
        self.all_plates = DEMO_PLATES.copy()
        self.blacklist_plates = ['GJ01AB1234', 'MH12CD5678', 'DL09EF9012', 'KA05GH3456']
        
    async def health_check(self) -> bool:
        try:
            resp = await self.client.get("/health")
            return resp.status_code == 200
        except:
            return False
    
    def generate_plate(self) -> str:
        """Generate a realistic Indian license plate"""
        state = random.choice(STATE_CODES)
        district = f"{random.randint(1, 99):02d}"
        series = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=random.randint(1, 2)))
        number = f"{random.randint(1, 9999):04d}"
        return f"{state}{district}{series}{number}"
    
    def get_random_plate(self) -> str:
        """Get a plate - sometimes from demo, sometimes generated"""
        if random.random() < 0.3 and self.all_plates:
            return random.choice(self.all_plates)
        return self.generate_plate()
    
    async def send_sighting(self, plate: str, camera_id: str, confidence: float = None):
        """Send a plate sighting to the backend"""
        if confidence is None:
            confidence = round(random.uniform(0.75, 0.99), 2)
        
        # Occasionally send lower confidence for realism
        if random.random() < 0.05:
            confidence = round(random.uniform(0.5, 0.75), 2)
        
        sighting = {
            "plate_text": plate,
            "camera_id": camera_id,
            "confidence": confidence,
            "snapshot_url": f"https://example.com/snapshots/{camera_id}_{plate}_{int(time.time())}.jpg",
            "bbox": {"x1": 100, "y1": 100, "x2": 300, "y2": 200},
            "ts": datetime.utcnow().isoformat() + "Z"
        }
        
        try:
            resp = await self.client.post("/api/v1/sightings", json=sighting)
            if resp.status_code not in (200, 201):
                print(f"Failed to send sighting: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"Error sending sighting: {e}")
    
    def choose_next_camera(self, current_camera: str, visited: List[str]) -> str:
        """Choose next camera based on network topology"""
        connections = CAMERA_CONNECTIONS.get(current_camera, [])
        # Filter out recently visited to avoid immediate back-and-forth
        unvisited = [c for c in connections if c not in visited[-3:]]
        if unvisited:
            return random.choice(unvisited)
        return random.choice(connections) if connections else current_camera
    
    async def spawn_vehicle(self):
        """Spawn a new vehicle at a random entry camera"""
        plate = self.get_random_plate()
        # Entry cameras (first in each zone)
        entry_cameras = ['CAM001', 'CAM003', 'CAM005', 'CAM007', 'CAM009', 'CAM011']
        start_camera = random.choice(entry_cameras)
        
        # Generate a path through the network
        path = [start_camera]
        current = start_camera
        visited = [start_camera]
        
        # Random path length 2-6 cameras
        path_length = random.randint(2, 6)
        for _ in range(path_length - 1):
            next_cam = self.choose_next_camera(current, visited)
            path.append(next_cam)
            visited.append(next_cam)
            current = next_cam
        
        self.active_vehicles[plate] = {
            'path': path,
            'current_index': 0,
            'next_move': time.time() + random.uniform(1, 5) / SIMULATION_SPEED,
            'is_blacklisted': plate in self.blacklist_plates,
        }
        
        # Send initial sighting
        await self.send_sighting(plate, start_camera)
        print(f"Spawned {plate} at {start_camera}, path: {' -> '.join(path)}")
    
    async def move_vehicles(self):
        """Move vehicles along their paths"""
        current_time = time.time()
        completed = []
        
        for plate, vehicle in self.active_vehicles.items():
            if current_time >= vehicle['next_move']:
                idx = vehicle['current_index']
                path = vehicle['path']
                
                if idx + 1 < len(path):
                    # Move to next camera
                    vehicle['current_index'] += 1
                    next_camera = path[idx + 1]
                    
                    # Time to next camera (simulate travel time)
                    travel_time = random.uniform(5, 30) / SIMULATION_SPEED
                    vehicle['next_move'] = current_time + travel_time
                    
                    await self.send_sighting(plate, next_camera)
                    print(f"{plate} moved to {next_camera} ({idx + 2}/{len(path)})")
                else:
                    # Journey complete
                    completed.append(plate)
                    print(f"{plate} completed journey")
        
        # Remove completed vehicles
        for plate in completed:
            del self.active_vehicles[plate]
    
    async def maybe_spawn_new(self):
        """Randomly spawn new vehicles"""
        # Spawn rate: ~1 vehicle per second per camera at 1x speed
        spawn_probability = min(0.1 * SIMULATION_SPEED / 10, 0.5)
        if random.random() < spawn_probability and len(self.active_vehicles) < 50:
            await self.spawn_vehicle()
    
    async def run_simulation(self):
        print(f"Starting traffic simulation (speed: {SIMULATION_SPEED}x)")
        print(f"Backend: {BACKEND_URL}")
        
        # Wait for backend to be ready
        while not await self.health_check():
            print("Waiting for backend...")
            await asyncio.sleep(2)
        
        print("Backend ready! Starting simulation...")
        
        # Initial spawn
        for _ in range(5):
            await self.spawn_vehicle()
            await asyncio.sleep(0.5)
        
        # Main loop
        try:
            while True:
                await self.move_vehicles()
                await self.maybe_spawn_new()
                await asyncio.sleep(0.5 / SIMULATION_SPEED)  # Base tick rate
        except KeyboardInterrupt:
            print("Simulation stopped")
        finally:
            await self.client.aclose()

async def main():
    simulator = TrafficSimulator()
    await simulator.run_simulation()

if __name__ == "__main__":
    asyncio.run(main())