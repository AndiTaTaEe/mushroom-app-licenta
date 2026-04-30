import glob
import time

class DS18B20:
    def __init__(self, read_timeout=2.0):
        """
        param read_timeout: maximum time in seconds to wait for a valid reading from the sensor, default is 2 seconds
        """
        # logic for finding the DS18B20 temperature sensor 
        self.read_timeout = read_timeout
        base_dir = '/sys/bus/w1/devices/'
        device_folders = glob.glob(base_dir + '28*')
        if not device_folders:
            raise FileNotFoundError("DS18B20 sensor not found, check connections")
        self.device_file = device_folders[0]  + '/w1_slave'

    def read_temp_raw(self):
        """
        reads the raw temperature values from w1_slave file
        """
        with open(self.device_file, 'r') as f:
            return f.readlines()

    def read_temp(self):
        """
        returns the temperature value in Celsius 
        """
        start_time = time.time()
        lines = self.read_temp_raw()
        while lines[0].strip()[-3:] != 'YES': # verifica daca gaseste YES pe prima linie din w1_slave, daca nu, asteapta 0.2s si citeste din nou
            if time.time() - start_time > self.read_timeout:
                raise RuntimeError("Timeout waiting for valid DS18B20 reading") # pentru a evita blocarea infinita, se adauga un timeout
            time.sleep(0.2)
            lines = self.read_temp_raw()
        equals_pos = lines[1].find('t=') # cauta pozitia din a doua linie unde gaseste 't='
        if equals_pos == -1:
            raise RuntimeError("Couldn't find data in DS18B20 reading") # daca nu gaseste, ridica o eroare
        temp_string = lines[1][equals_pos + 2:] # extrage valoare de dupa 't='
        return float(temp_string) / 1000.0 # imparte la 1000 si face casting la float pentru a obtine temperatura in grade Celsius