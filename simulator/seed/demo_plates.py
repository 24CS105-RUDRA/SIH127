# Demo plate data for traffic simulation

DEMO_PLATES = [
    # Gujarat plates
    'GJ01AB1234', 'GJ01CD5678', 'GJ01EF9012', 'GJ01GH3456', 'GJ01IJ7890',
    'GJ02KL1234', 'GJ02MN5678', 'GJ03OP9012', 'GJ04QR3456', 'GJ05ST7890',
    'GJ06UV1234', 'GJ07WX5678', 'GJ08YZ9012', 'GJ09AB3456', 'GJ10CD7890',
    
    # Maharashtra plates
    'MH01AB1234', 'MH02CD5678', 'MH03EF9012', 'MH04GH3456', 'MH05IJ7890',
    'MH06KL1234', 'MH07MN5678', 'MH08OP9012', 'MH09QR3456', 'MH10ST7890',
    'MH11UV1234', 'MH12CD5678', 'MH13EF9012', 'MH14GH3456', 'MH15IJ7890',
    
    # Delhi plates
    'DL01AB1234', 'DL02CD5678', 'DL03EF9012', 'DL04GH3456', 'DL05IJ7890',
    'DL06KL1234', 'DL07MN5678', 'DL08OP9012', 'DL09EF9012', 'DL10QR3456',
    
    # Karnataka plates
    'KA01AB1234', 'KA02CD5678', 'KA03EF9012', 'KA04GH3456', 'KA05GH3456',
    'KA06IJ7890', 'KA07KL1234', 'KA08MN5678', 'KA09OP9012', 'KA10QR3456',
    
    # Tamil Nadu plates
    'TN01AB1234', 'TN02CD5678', 'TN03EF9012', 'TN04GH3456', 'TN05IJ7890',
    'TN06KL1234', 'TN07MN5678', 'TN08OP9012', 'TN09QR3456', 'TN10ST7890',
    
    # Rajasthan plates
    'RJ01AB1234', 'RJ02CD5678', 'RJ03EF9012', 'RJ04GH3456', 'RJ05IJ7890',
    
    # Uttar Pradesh plates
    'UP01AB1234', 'UP02CD5678', 'UP03EF9012', 'UP04GH3456', 'UP05IJ7890',
    
    # West Bengal plates
    'WB01AB1234', 'WB02CD5678', 'WB03EF9012', 'WB04GH3456', 'WB05IJ7890',
    
    # Punjab plates
    'PB01AB1234', 'PB02CD5678', 'PB03EF9012', 'PB04GH3456', 'PB05IJ7890',
    
    # Haryana plates
    'HR01AB1234', 'HR02CD5678', 'HR03EF9012', 'HR04GH3456', 'HR05IJ7890',
    
    # Kerala plates
    'KL01AB1234', 'KL02CD5678', 'KL03EF9012', 'KL04GH3456', 'KL05IJ7890',
    
    # Telangana plates
    'TS01AB1234', 'TS02CD5678', 'TS03EF9012', 'TS04GH3456', 'TS05IJ7890',
    
    # Andhra Pradesh plates
    'AP01AB1234', 'AP02CD5678', 'AP03EF9012', 'AP04GH3456', 'AP05IJ7890',
    
    # Madhya Pradesh plates
    'MP01AB1234', 'MP02CD5678', 'MP03EF9012', 'MP04GH3456', 'MP05IJ7890',
    
    # Bihar plates
    'BR01AB1234', 'BR02CD5678', 'BR03EF9012', 'BR04GH3456', 'BR05IJ7890',
    
    # Odisha plates
    'OD01AB1234', 'OD02CD5678', 'OD03EF9012', 'OD04GH3456', 'OD05IJ7890',
]

# Camera locations (lat, lon) - Ahmedabad/Anand area
CAMERA_LOCATIONS = {
    'CAM001': (23.0225, 72.5714),  # Zone A - North
    'CAM002': (23.0300, 72.5800),  # Zone A - South
    'CAM003': (23.0400, 72.5900),  # Zone B - East
    'CAM004': (23.0500, 72.6000),  # Zone B - West
    'CAM005': (23.0600, 72.6100),  # Zone C - North
    'CAM006': (23.0700, 72.6200),  # Zone C - South
    'CAM007': (23.0800, 72.6300),  # Zone D - East
    'CAM008': (23.0900, 72.6400),  # Zone D - West
    'CAM009': (23.1000, 72.6500),  # Zone E - North
    'CAM010': (23.1100, 72.6600),  # Zone E - South
    'CAM011': (23.1200, 72.6700),  # Zone F - East
    'CAM012': (23.1300, 72.6800),  # Zone F - West
}

CAMERA_ZONES = {
    'CAM001': 'Zone-A',
    'CAM002': 'Zone-A',
    'CAM003': 'Zone-B',
    'CAM004': 'Zone-B',
    'CAM005': 'Zone-C',
    'CAM006': 'Zone-C',
    'CAM007': 'Zone-D',
    'CAM008': 'Zone-D',
    'CAM009': 'Zone-E',
    'CAM010': 'Zone-E',
    'CAM011': 'Zone-F',
    'CAM012': 'Zone-F',
}

# Inter-camera distances (km) for speed calculation
CAMERA_DISTANCES = {
    ('CAM001', 'CAM002'): 1.2,
    ('CAM001', 'CAM003'): 2.1,
    ('CAM002', 'CAM004'): 2.0,
    ('CAM003', 'CAM005'): 1.8,
    ('CAM003', 'CAM007'): 2.5,
    ('CAM004', 'CAM006'): 1.9,
    ('CAM004', 'CAM008'): 2.3,
    ('CAM005', 'CAM009'): 1.7,
    ('CAM006', 'CAM010'): 1.8,
    ('CAM007', 'CAM011'): 2.0,
    ('CAM008', 'CAM012'): 1.9,
    ('CAM009', 'CAM010'): 1.5,
    ('CAM011', 'CAM012'): 1.6,
}

# Make distances bidirectional
for (a, b), dist in list(CAMERA_DISTANCES.items()):
    CAMERA_DISTANCES[(b, a)] = dist