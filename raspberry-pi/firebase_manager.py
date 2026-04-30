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
            print("Firebase initialized successfully")
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            raise

    def upload_data(self, data_dictionary):
        """
        param data_dictionary: a dictionary containing the sensor readings to be uploaded to firebase
        """
        try:
            current_time = time.time()
            data_dictionary['timestamp'] = str(datetime.datetime.now()) # add a timestamp to the uploaded data

            # current readings node - updating every 3 seconds
            self.root_ref.child('current_readings').set(data_dictionary) # overwriting the current data with new data

            # past readings node - updating every 5 minutes
            if current_time - self.last_upload_time >= self.upload_interval:
                self.root_ref.child('past_readings').push(data_dictionary) # pushing data to past_readings, creating a new entry with a unique key on timestamp
                self.last_upload_time = current_time
                print("Past readings uploaded to Firebase")
        except Exception as e:
            print(f"Firebase Sync Error: {e}")

    def get_push_token(self):
        """
        this function is used to retrieve the push token from Firebase for sending notifications to the mobile app, in order to trigger notifications from RPi5 when the readings exceed certain thresholds
        """
        try:
            return db.reference("admin/push_token").get() # gets the push token from the database
        except Exception as e:
            print(f"Error retrieving push token: {e}")
            return None
