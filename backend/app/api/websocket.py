from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Dict, List, Set
import json
import asyncio
from app.core.config import settings

router = APIRouter(prefix="/ws", tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "alerts": set(),
            "heatmap": set(),
            "density": set()
        }

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)

    async def broadcast(self, channel: str, message: dict):
        if channel not in self.active_connections:
            return
        
        disconnected = set()
        for connection in self.active_connections[channel]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        
        for conn in disconnected:
            self.active_connections[channel].discard(conn)

    async def send_personal(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_json(message)
        except Exception:
            pass


manager = ConnectionManager()


@router.websocket("/alerts")
async def websocket_alerts(
    websocket: WebSocket,
    token: str = Query(None)
):
    """WebSocket for real-time alerts"""
    await manager.connect(websocket, "alerts")
    try:
        while True:
            # Keep connection alive, listen for ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, "alerts")
    except Exception:
        manager.disconnect(websocket, "alerts")


@router.websocket("/heatmap")
async def websocket_heatmap(
    websocket: WebSocket,
    token: str = Query(None)
):
    """WebSocket for real-time heatmap updates"""
    await manager.connect(websocket, "heatmap")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, "heatmap")
    except Exception:
        manager.disconnect(websocket, "heatmap")


@router.websocket("/density")
async def websocket_density(
    websocket: WebSocket,
    token: str = Query(None)
):
    """WebSocket for real-time density updates"""
    await manager.connect(websocket, "density")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, "density")
    except Exception:
        manager.disconnect(websocket, "density")


# Functions to be called from services to broadcast updates
async def broadcast_alert(alert_data: dict):
    """Broadcast new alert to all connected clients"""
    await manager.broadcast("alerts", {
        "type": "new_alert",
        "data": alert_data
    })


async def broadcast_heatmap(heatmap_data: dict):
    """Broadcast heatmap update"""
    await manager.broadcast("heatmap", {
        "type": "heatmap_update",
        "data": heatmap_data
    })


async def broadcast_density(density_data: dict):
    """Broadcast density update"""
    await manager.broadcast("density", {
        "type": "density_update",
        "data": density_data
    })