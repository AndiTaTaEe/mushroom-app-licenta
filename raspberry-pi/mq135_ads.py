import time
import math


class MQ135:
    """
    class to interface with the MQ-135 gas sensor using ADS1115 ADC
    MQ-135 will be used in this project for detecting the CO2 levels of a mushroom growing environment
    """

    #MQ-135 sensor constants for CO2 - from datasheet - "sensivity characteristics of the MQ-135", calculated by Davide Gironi based on the sensitivity characteristics of the sensor
    MQ135_SCALINGFACTOR = 116.6020682 
    MQ135_EXPONENT = -2.769034857

    #MQ-135 calibration constants
    MQ135_DEFAULTPPM = 427.13 #default CO2 concentration for calibration, by 15/12/2025
    MQ135_DEFAULTRO = 41763.0 #to be used for calibration
    MQ135_CALIBRATED_RO = 37546.26 #calibrated Ro value for the MQ135 sensor - obtained after calibration in fresh air (around 431ppm CO2) on 25/4/2026
    

    #MQ-135 validity constants
    MQ135_MIN_RSRO_RATIO = 0.358
    MQ135_MAX_RSRO_RATIO = 2.428
    

    #hardware cofniguration
    ADS_RL_VALUE = 1000.0 #load resistance on the board - 1 kOhms
    VOLTAGE_IN = 5.0 #supply voltage for the MQ-135 sensor

    def __init__(self, adc_channel, voltage_divider_ratio=1.0, ro=None):
        """
        :param adc_channel: ADC channel where the MQ-135 sensor is connected (A0-A3)
        :param ro: (optional) pre-calibrated Ro value, if not provided => the MQ135_DEFAULTRO will be used
        :param voltage_divider_ratio: if voltage_divider_ratio is used, it should be provided here. if no voltage divider used, leave it to 1.0
        """
        self.channel = adc_channel
        self.divider_ratio = voltage_divider_ratio
        #use the provided Ro value, or the default one if not calibrated
        self.ro = ro if ro is not None else self.MQ135_DEFAULTRO

    
    def get_voltage(self):
        """
        returns the original sensor voltage reading from the ADC channel, adjusted for divider ratio if used
        """
        read_voltage = self.channel.voltage #read the real voltage from the ADC channel (in our case, using a voltage divider with 10kohms and 22kohms resistors => Vout = 5 * (10/(10+22)) = 1.5625V)

        real_sensor_voltage = read_voltage * self.divider_ratio #adjust for voltage divider if used
        return real_sensor_voltage
    
    def get_resistance(self):
        """
        returns the calculated sensor (ADS1115) resistance (Rs) based on the voltage reading
        Formula = Rs = RL * (Vin - Vout) / Vout, where RL is the load resistance on the board (1kOhms), Vin is the supply voltage (5V), Vout is the sensor voltage read from ADC
        """
        voltage_out = self.get_voltage()
        #avoid division by zero if voltage_out is 0
        if voltage_out <=0:
            return -1.0
        
        resistance = self.ADS_RL_VALUE * (self.VOLTAGE_IN - voltage_out) / voltage_out
        return resistance
    
    def get_ppm(self):
        """
        returns the ppm (parts per million) based on the sensor resistance (Rs) and the calibrated Ro value
        Formula: ppm = a*(Rs/Ro)^b, a - MQ135_SCALINGFACTOR, b - MQ135_EXPONENT
        """
        resistance = self.get_resistance()

        # avoid invalid resistance values
        if resistance <=0:
            return 0.0
        
        #calculate the ratio between Rs and Ro
        ratio = resistance / self.ro

        #calculate PPM based on the formula
        if ratio > self.MQ135_MIN_RSRO_RATIO and ratio < self.MQ135_MAX_RSRO_RATIO:
            ppm = self.MQ135_SCALINGFACTOR * math.pow(ratio, self.MQ135_EXPONENT)
        else:
            ppm = 0.0 #out of valid range 
        return ppm
    
    def calibrate (self, current_ppm=MQ135_DEFAULTPPM):
        """
        calibrates the sensor by calculating the Ro value based on the current resistance and a known ppm value - default is MQ135_DEFAULTPPM (427.13 ppm)

        formula: Ro = Rs * (a/ppm)^(1/b), where a - MQ135_SCALINGFACTOR, b - MQ135_EXPONENT
        the Rs value represents an average resistance value in 20 samples. a sample is taken every 0.1s
        """
        
        #take 20 samples, 0.1s apart => total 2 seconds
        resistance_sum = 0
        samples = 20
        for _ in range(samples):
            resistance = self.get_resistance()
            resistance_sum += resistance
            time.sleep(0.1)
        
        avg_resistance = resistance_sum / samples

        #calculate Ro based on the formula
        self.ro = avg_resistance * math.pow((self.MQ135_SCALINGFACTOR / current_ppm), (1.0/self.MQ135_EXPONENT))
        print(f"MQ-135 calibrated Ro value: {self.ro} Ohms")
        return self.ro
    
    

    
