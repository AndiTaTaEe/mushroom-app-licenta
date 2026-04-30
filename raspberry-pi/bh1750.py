import time 
import adafruit_bus_device.i2c_device as i2c_device 

#define constants from datasheet
class BH1750(object):
    #operating modes
    PWR_DOWN = 0x00
    PWR_ON = 0x01
    RESET = 0x07
    
    #measurement modes
    CONT_HIGH_RES_MODE = 0x10 #measurement at 1lx res, time - 120ms
    CONT_HIGH_RES_MODE2 = 0x11 #measurement at 0.5lx res, time - 120ms
    CONT_LOW_RES_MODE = 0x13 #measurement at 4lx res, time - 16ms
    ONCE_HIGH_RES_MODE = 0x20 #measurement at 1lx res, time - 120ms, goes to PWR_DOWN
    ONCE_HIGH_RES_MODE2 = 0x21 #measurement at 0.5lx res, time - 120ms, goes to PWR_DOWN
    ONCE_LOW_RES_MODE = 0x23 #measurement at 4lx res, time - 16ms, goes to PWR_DOWN  

    #addresses - 0x23 if ADDR pin is low, 0x5C if ADDR pin is high
    def __init__(self, i2c_bus, address=0x23):
        self.i2c_device = i2c_device.I2CDevice(i2c_bus, address)
        self.off()
        self.reset()

    #turn sensor of
    def off(self):
        self.set_mode(self.PWR_DOWN)
    
    #turn sensor on
    def on(self):
        self.set_mode(self.PWR_ON)

    #reset sensor, turn on first if necessary
    def reset(self):
        self.on()
        self.set_mode(self.RESET)

    #set measurement mode
    def set_mode(self, mode):
        self.mode = mode #setam modul de masurare - vezi mai sus
        with self.i2c_device as i2c:
            i2c.write(bytes([mode])) #trimitem comanda de setare a modului

    #reading light level
    def read_light(self, mode):
        #continuous mode
        if mode & 0x10 and mode != self.mode:
            self.set_mode(mode)
        #one-tme mode
        if mode & 0x20:
            self.set_mode(mode)
        #measurement times based on datasheet
        if mode in (0x13, 0x23):
            time.sleep(0.024) #24ms for low res
        else:
            time.sleep(0.180) #180ms for high res

        #read data - 2 bytes - high byte[15:8], low byte[7:0]
        data = bytearray(2) #alocam 2 bytes
        with self.i2c_device as i2c:
            i2c.readinto(data) #citim datele

        #convert data to lux
        raw_data = (data[0] << 8 | data[1]) #combine the high and low bytes
        dividing_factor = 2.0 if mode in (0x11, 0x21) else 1.0 #if mode is high res2, divide the raw_data by 2.4, else by 1.2
        lux_value = raw_data / (1.2 * dividing_factor) #convert to lux
        return lux_value
        
        
        
        
         


