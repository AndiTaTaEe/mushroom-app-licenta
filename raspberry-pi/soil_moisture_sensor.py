import time

class HW101:

    def __init__(self, adc_channel, dry_val=None, wet_val=None):
        """
        :param adc_channel: ADC channel where the soil moisture sensor is connected
        :param dry_val: calibrated Dry ADC value corresponding to completely dry soil (optional)
        :param wet_val: calibrated Wet ADC value corresponding to completely wet soil (optional)
        """
        
        self.channel = adc_channel
        self.dry_val = dry_val
        self.wet_val = wet_val

    def get_raw_value(self):
        """
        returns the raw ADC value from the soil moisture sensor
        """
        return self.channel.value
    
    def get_voltage(self):
        """
        returns the voltage reading from the soil moisture sensor
        """
        return self.channel.voltage
    
    def _average_readings(self, samples=20, delay=0.1):
        """
        takes multiple readings and returns the average raw ADC value, in order to smooth out the noise during calibration
        """
        total_readings_sum = 0
        for _ in range(samples):
            total_readings_sum += self.get_raw_value()
            time.sleep(delay)
        return int(total_readings_sum / samples)
    
    def calibrate(self):
        """
        calibrates the soil moisture sensor by reading the current ADC value and setting it as the dry and wet values. User should ensure the sensor is in dry soil for dry calibration and in wet soil for wet calibration.
        """
        
        # calibrating dry value
        input("Calibrating dry value. Please ensure the sensor is completely dry. Press Enter to continue...")
        print("Reading dry value...", end="", flush=True)
        self.dry_val = self._average_readings()
        print(f" Done. Dry value set to: {self.dry_val}")

        # calibrating wet value
        input("Calibrating wet value. Please ensure the sensor is completely wet. Press Enter to continue...")
        print("Reading wet value...", end="", flush=True)
        self.wet_val = self._average_readings()
        print(f" Done. Wet value set to: {self.wet_val}")

        print(f"Soil moisture sensor calibrated. Dry value: {self.dry_val}, Wet value: {self.wet_val}")

        if self.dry_val < self.wet_val:
            print("Warning: Dry value is less than or equal to Wet value. Please recalibrate the sensor.")

    def get_moisture_percentage(self):
        """
        returns the soil moisture level as a percentage (0% = dry, 100% = wet) based on the calibrated dry and wet values
        """
        if self.dry_val is None or self.wet_val is None:
            raise ValueError("Soil moisture sensor is not calibrated. Please run .calibrate() function first")
        
        raw_value = self.get_raw_value()
        
        # clamp the raw value between dry and wet values
        if raw_value > self.dry_val:
            raw_value = self.dry_val
        if raw_value < self.wet_val:
            raw_value = self.wet_val

        # calculating moisture percentage
        # HW-101 is a capacitive sensor - higher ADC values - drier soil, lower ADC values - wetter soil
        # formula: moisture% = ((dry - raw) / (dry - wet)) * 100
        moisture_percentage = (self.dry_val - raw_value) / (self.dry_val - self.wet_val) * 100.0
        return round(moisture_percentage, 1)
