import re
from typing import Optional
from rapidfuzz import fuzz, process
from app.core.config import settings


INDIAN_PLATE_REGEX = re.compile(r'^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$')
CONFUSION_PAIRS = {
    '0': 'O', 'O': '0',
    '1': 'I', 'I': '1',
    '8': 'B', 'B': '8',
    '5': 'S', 'S': '5',
    '6': 'G', 'G': '6',
    '9': 'P', 'P': '9',
    '2': 'Z', 'Z': '2',
}


def normalize_plate(plate: str) -> str:
    """Normalize plate text: uppercase, remove spaces/special chars, fix confusion pairs"""
    if not plate:
        return ""
    
    # Remove spaces, hyphens, special chars
    normalized = re.sub(r'[^A-Z0-9]', '', plate.upper())
    
    # Apply confusion pair corrections for Indian plate format
    # First 2 chars should be letters (state code)
    # Next 2 chars should be digits (district code)
    # Next 1-2 chars should be letters (series)
    # Last 4 chars should be digits
    
    if len(normalized) >= 9:
        result = list(normalized)
        
        # State code (positions 0,1) - should be letters
        for i in [0, 1]:
            if i < len(result) and result[i].isdigit():
                result[i] = CONFUSION_PAIRS.get(result[i], result[i])
        
        # District code (positions 2,3) - should be digits
        for i in [2, 3]:
            if i < len(result) and result[i].isalpha():
                result[i] = CONFUSION_PAIRS.get(result[i], result[i])
        
        # Last 4 positions (should be digits)
        for i in range(-4, 0):
            abs_i = len(result) + i
            if abs_i >= 0 and result[abs_i].isalpha():
                result[abs_i] = CONFUSION_PAIRS.get(result[abs_i], result[abs_i])
        
        normalized = ''.join(result)
    
    return normalized


def validate_indian_plate(plate: str) -> bool:
    """Validate if plate matches Indian format"""
    normalized = normalize_plate(plate)
    return bool(INDIAN_PLATE_REGEX.match(normalized))


def calculate_plate_similarity(plate1: str, plate2: str) -> float:
    """Calculate similarity between two plates using Levenshtein distance"""
    if not plate1 or not plate2:
        return 0.0
    
    norm1 = normalize_plate(plate1)
    norm2 = normalize_plate(plate2)
    
    if norm1 == norm2:
        return 1.0
    
    # Use ratio (0-100) normalized to 0-1
    return fuzz.ratio(norm1, norm2) / 100.0


def fuzzy_match_plate(target: str, candidates: list[str], threshold: int = None) -> list[tuple[str, float]]:
    """Find fuzzy matches for a plate from candidates"""
    if threshold is None:
        threshold = settings.FUZZY_MATCH_THRESHOLD
    
    norm_target = normalize_plate(target)
    norm_candidates = [(c, normalize_plate(c)) for c in candidates]
    
    matches = []
    for original, normalized in norm_candidates:
        # Levenshtein distance
        distance = fuzz.distance(norm_target, normalized)
        if distance <= threshold:
            similarity = 1.0 - (distance / max(len(norm_target), len(normalized)))
            matches.append((original, similarity))
    
    # Sort by similarity descending
    matches.sort(key=lambda x: x[1], reverse=True)
    return matches


def is_plausible_transition(
    camera1_id: str, 
    camera2_id: str, 
    time_diff_seconds: float,
    camera_locations: dict[str, tuple[float, float]],
    max_speed_kmph: float = 150.0
) -> bool:
    """Check if transition between two cameras is physically plausible"""
    if camera1_id not in camera_locations or camera2_id not in camera_locations:
        return True  # Can't verify, assume plausible
    
    from geopy.distance import geodesic
    
    loc1 = camera_locations[camera1_id]
    loc2 = camera_locations[camera2_id]
    
    distance_km = geodesic(loc1, loc2).kilometers
    if distance_km == 0:
        return True
    
    required_speed = (distance_km / time_diff_seconds) * 3600  # km/h
    return required_speed <= max_speed_kmph