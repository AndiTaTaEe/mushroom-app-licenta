import time
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn
from mq135_ads import MQ135


i2c_bus = busio.I2C(board.SCL, board.SDA)
ads = ADS.ADS1115(i2c_bus)

ads.gain = 1 
channel_mq135 = AnalogIn(ads, 0)

mq135_sensor = MQ135(channel_mq135, voltage_divider_ratio=3.2)

print("MQ-135 Calibration Mode")
print("Place sensor in fresh air and wait for stabilization...")
time.sleep(5)

try:
    print("Calibrating...")
    new_ro = mq135_sensor.calibrate()
    print("-" * 30)
    print(f"NEW CALIBRATED RO: {new_ro:.2f}")
    print("-" * 30)
    print("Copy this value into your MQ135_CALIBRATED_RO constant.")
except Exception as e:
    print(f"Calibration failed: {e}")