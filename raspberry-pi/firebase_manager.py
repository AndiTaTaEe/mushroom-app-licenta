import os
import datetime
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, db
import json
import time 

class FirebaseManager:
    def __init__(self, upload_to_firebase_interval=300):
        """
        param upload_to_firebase_interval: interval in seconds for uploading past readings to firebase, default is 300 seconds (5 minutes)
        """
        self.upload_interval = upload_to_firebase_interval
        self.last_upload_time = 0 # variable for tracking last upload to firebase

        # alert cooldown variables - for sending alerts to an alert box in the mobile app 
        self.alert_cooldown = 900 
        self.last_alert_times = {
            "temperature_c": 0,
            "humidity_percent": 0,
            "light_lux": 0,
            "co2_ppm": 0,
            "soil_moisture_percent": 0,
            "vpd_kpa": 0,
            "system": 0 # for system status implementation in fetching the live data from firebase
        }

        # predefined thresholds for the farm parameters - used when the Pi boots up, before firebase overriding them
        self.farm_thresholds = {
            "temperature_c": {"min": 15.0, "max": 30.0},
            "humidity_percent": {"min": 80.0, "max": 90.0},
            "light_lux": {"min": 500.0, "max": 1000.0},
            "co2_ppm": {"min": 500.0, "max": 1000.0},
            "soil_moisture_percent": {"min": 80.0, "max": 90.0},
            "vpd_kpa": {"min": 0.2, "max": 0.4}
        }

        # loading env variables
        load_dotenv()
        config_json_string = os.getenv("FIREBASE_CONFIG")
        db_url = os.getenv("DATABASE_URL") 

        #initialize firebase app with credentials and database URL from .env file
        try:
            #convert the JSON string from config_json_string to a dictionary
            config_dict = json.loads(config_json_string)
            cred = credentials.Certificate(config_dict)
            firebase_admin.initialize_app(cred, {'databaseURL': db_url})
            self.root_ref = db.reference('/proiect-licenta') # reference to the root of the db for this project

            # attaching the listener - the pi will listen for changes in the 'farm_settings' node in firebase
            self.settings_ref = self.root_ref.child('farm_settings')
            self.settings_ref.listen(self._settings_listener) # background listener for changes in farm setttings

            print("Firebase initialized successfully. Listening for mobile app changes in farm settings...")

            # for caching the push token
            self.cached_push_token = None # variable for caching the push token, to avoid fetching it from firebase every time we need to send a notification, since the push token does not change often and fetching it every time would be inefficient
            self._fetch_initial_push_token()
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            raise


    # function that fetchs the push token from firebase from the beginning and caches it into the FirebaseManager instance
    # we avoid fetching the push token every time we send a notification
    def _fetch_initial_push_token(self):
        try:
            self.cached_push_token = db.reference("admin/push_token").get() # fetch the push token from firebase and cache it
            print("Initial push token fetched and cached successfully")
        except Exception as e:
            print(f"Failed to cache push token: {e}")

    def get_push_token(self):
        return self.cached_push_token # return the cached push token, to avoid fetching it from firebase every time we need to send a notification

    # listener function for changes in farm settings in firebase, runs automatically in the background when changes are detected 
    def _settings_listener(self, event):
        """
        runs automatically in the background in response to changes in the 'farm_settings' node in firebase 
        """
        incoming_data = event.data
        if incoming_data:
            print("Mobile app update received!")

            if event.path == '/': # if the entire farm_settings node is updated
                self.farm_thresholds.update(incoming_data) # update the local farm_thresholds with the new values from firebase
            else: 
                key = event.path.replace('/', '') # get the key of the updated string
                if key in self.farm_thresholds: 
                    if isinstance(incoming_data, dict):
                        self.farm_thresholds[key].update(incoming_data) # update the specific parameter thresholds with the new values from firebase
                    else:
                        self.farm_thresholds[key] = incoming_data # if the incoming data is not a dictionary, update the entire parameter thresholds with the new value from firebase

            print("New thresholds successfully applied without rebooting!")

    def get_thresholds(self):
        return self.farm_thresholds # return the current farm thresholds, used in the main loop to compare with the sensor readings and trigger notifications if thresholds are exceeded

    def upload_data(self, data_dictionary):
        """
        param data_dictionary: a dictionary containing the sensor readings to be uploaded to firebase
        """
        try:
            # current readings node - updating every 3 seconds (SAMPLE_INTERVAL) in main loop
            self.root_ref.child('current_readings').set(data_dictionary) # overwriting the current data with new data
            print("[CL-T] Current readings updated in Firebase")
            current_time = data_dictionary['last_updated'] / 1000 # convert timestamp back to seconds for easier time calculations

            # past readings node - updating every 5 minutes
            if current_time - self.last_upload_time >= self.upload_interval:
                self.root_ref.child('past_readings').push(data_dictionary) # pushing data to past_readings, creating a new entry with a unique key on timestamp
                self.last_upload_time = current_time
                print("Past readings uploaded to Firebase")
        except Exception as e:
            print(f"Firebase Sync Error: {e}")

    def register_alert(self, message, alert_type, parameter):
        """
        pushes an alert to firebase if the cooldown period (15 min) has passed
        :param message: text to display in the alert box in the mobile app
        :param alert_type: "critical" or "warning", used for different styling in the mobile app
        :param parameter: "temperature_c", "humidity_percent", "light_lux", "co2_ppm", "soil_moisture_percent", "vpd_kpa" or "system" - used for tracking the cooldown for each parameter separately, and for the system status implementation in firebase
        """
        now = time.time()

        #check if the cooldown period has passed for this parameter
        if (now - self.last_alert_times.get(parameter, 0)) > self.alert_cooldown:
            alert_data = {
                "timestamp": int(now*1000),
                "message": message,
                "type": alert_type,
                "parameter": parameter
            } 
            try:
                self.root_ref.child('alerts').push(alert_data) # push the alert to firebase, creating a new entry with a unique key on timestamp
                self.last_alert_times[parameter] = now
                print(f"Alert sent to Firebase: {message}")
                # function telling proiect_licenta.py to trigger the push notification to the mobile app through the Expo push notification service, using the push token stored in firebase
                return True
            except Exception as e:
                print(f"Failed to send alert to Firebase: {e}")
                return False # if the alert failed to send to firebase, we return False so that proiect_licenta.py does not trigger the push notification 
        return False # if the cooldown period has not passed, we return False so that proiect_licenta.py does not trigger the push notification 
 
