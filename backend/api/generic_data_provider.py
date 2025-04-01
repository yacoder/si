import os
import uuid

import json
import pymysql


from backend.app.util.util import ArgConfig




class GenericDataProvider:
    def __init__(self):
        db_config = os.getenv("SI_DB_CONFIG")
        self.transient = {}

        if db_config is not None and db_config.startswith("mysql"):
            # MySQL connection string format: mysql://user:password@host/database

            _, db_config = db_config.split("://")
            user, password_host = db_config.split(":")
            password, host_database = password_host.split("@")
            host, database = host_database.split("/")
         

            self.connection = pymysql.connect(
                host=host,
                user=user,
                password=password,
                database=database,
                cursorclass=pymysql.cursors.DictCursor  # Ensures results are returned as dictionaries
            )
            self.lookup_one_by_id = self.lookup_one_by_id_sql
            self.lookup_one_by_field = self.lookup_one_by_field_sql
            self.lookup_many_by_field = self.lookup_many_by_field_sql
            self.upsert_one = self.upsert_one_sql
        else:
            self.data = {}  # In-memory storage for JSON data

            self.use_predefined_json = False  # Flag to indicate if predefined JSON data should be used

            env_use_predefined_json = os.getenv("SI_SAVE_JSON")
            if env_use_predefined_json is None:
                env_use_predefined_json = ArgConfig.is_env_use_predefined_json()
            if env_use_predefined_json is not None and (
                (isinstance(env_use_predefined_json, bool) and env_use_predefined_json) or
                (isinstance(env_use_predefined_json, str) and env_use_predefined_json.lower() == "true")):
                self.use_predefined_json = True
                # Load predefined JSON data from a file if the file exists
                if os.path.exists("data.json"):
                    with open("data.json", "r") as f:
                        self.data = json.load(f)


            self.lookup_one_by_id = self.lookup_one_by_id_json
            self.lookup_one_by_field = self.lookup_one_by_field_json
            self.lookup_many_by_field = self.lookup_many_by_field_json
            self.upsert_one = self.upsert_one_json





    def lookup_one_by_id_sql(self, entity: str, id: str):
        """
        Fetch a single record from the specified entity (table) where the ID matches the given value.
        Returns the record as a dictionary of key-value pairs.
        """
        try:
            transient_result = self.storage_lookup_one_by_id(self.transient, entity, id)
            if transient_result is not None:
                return transient_result
            
            if not hasattr(self, 'connection') or self.connection is None:
                raise Exception("Database connection is not initialized.")

            with self.connection.cursor() as cursor:
                query = f"SELECT * FROM {entity} WHERE id = %s"
                cursor.execute(query, (id,))
                result = cursor.fetchone()
            return result
        except pymysql.MySQLError as err:
            print(f"Error: {err}")
            return None

    def lookup_one_by_field_sql(self, entity: str, field: str, value: str):
        """
        Fetch a single record from the specified entity (table) where the field matches the given value.
        Returns the record as a dictionary of key-value pairs.
        """
        try:
            transient_result = self.storage_lookup_one_by_field(self.transient, entity, field, value)
            if transient_result is not None:
                return transient_result
            
            if not hasattr(self, 'connection') or self.connection is None:
                raise Exception("Database connection is not initialized.")

            with self.connection.cursor() as cursor:
                query = f"SELECT * FROM {entity} WHERE {field} = %s"
                cursor.execute(query, (value,))
                result = cursor.fetchone()
            return result
        except pymysql.MySQLError as err:
            print(f"Error: {err}")
            return None

    def lookup_many_by_field_sql(self, entity: str, field: str, value: str):
        """
        Fetch multiple records from the specified entity (table) where the field matches the given value.
        Returns the records as a list of dictionaries.
        """
        try:
           

            if not hasattr(self, 'connection') or self.connection is None:
                raise Exception("Database connection is not initialized.")
            
            

            with self.connection.cursor() as cursor:
                query = f"SELECT * FROM {entity} WHERE {field} = %s"
                cursor.execute(query, (value,))
                results = cursor.fetchall()

            transient_result = self.storage_lookup_many_by_field(self.transient, entity, field, value)
            if transient_result is not None:
                results.extend(transient_result)
            
            return results
        except pymysql.MySQLError as err:
            print(f"Error: {err}")
            return []

    def upsert_one_sql(self, entity: str, id: str, data: dict, use_transient: bool = False):
        """
        Insert or update a record in the specified entity (table) based on the fields in the data dictionary.
        If a record with the given ID exists, it updates the record; otherwise, it inserts a new record.
        If the ID is None or an empty string, a new unique ID is generated.
        Returns the ID of the upserted record.
        """
        try:

            if use_transient:
                # Use the transient storage for upsert
                return self.storage_upsert_one(self.transient, entity, id, data)
            
            if not hasattr(self, 'connection') or self.connection is None:
                raise Exception("Database connection is not initialized.")

            if not id:
                id = str(uuid.uuid4())

            with self.connection.cursor() as cursor:
                columns = ", ".join(data.keys())
                placeholders = ", ".join(["%s"] * len(data))
                update_clause = ", ".join([f"{key} = %s" for key in data.keys()])

                query = f"""
                    INSERT INTO {entity} (id, {columns})
                    VALUES (%s, {placeholders})
                    ON DUPLICATE KEY UPDATE {update_clause}
                """
                values = (id, *data.values(), *data.values())
                cursor.execute(query, values)
                self.connection.commit()
            return id
        except pymysql.MySQLError as err:
            print(f"Error: {err}")
            return None
        

    def storage_lookup_one_by_id(self, storage:dict, entity: str, id: str):
        """
        Fetch a single record from the in-memory JSON data where the ID matches the given value.
        Returns the record as a dictionary of key-value pairs.
        """
        if entity not in storage:
            return None
        return storage[entity].get(id, None)
    
    def storage_lookup_one_by_field(self, storage:dict, entity: str, field: str, value: str):
        """
        Fetch a single record from the in-memory JSON data where the field matches the given value.
        Returns the record as a dictionary of key-value pairs.
        """
        if entity not in storage:
            return None
        for record in storage[entity].values():
            if record.get(field) == value:
                return record
        return None

    def storage_lookup_many_by_field(self, storage:dict, entity: str, field: str, value: str):
        """
        Fetch multiple records from the in-memory JSON data where the field matches the given value.
        Returns the records as a list of dictionaries.
        """
        if entity not in storage:
            return []
        return [record for record in storage[entity].values() if record.get(field) == value]

    def storage_upsert_one(self, storage:dict, entity: str, id: str, data: dict):
        """
        Insert or update a record in the in-memory JSON data based on the fields in the data dictionary.
        If the ID is None or an empty string, a new unique ID is generated.
        Returns the ID of the upserted record.
        """
        if entity not in storage:
            storage[entity] = {}

        # Generate a unique ID if the provided ID is None or empty
        if not id:
            id = str(uuid.uuid4())
        
        data["id"] = id

        # Insert or update the record
        storage[entity][id] = data

        return id

    def lookup_one_by_id_json(self, entity: str, id: str):
        """
        Fetch a single record from the in-memory JSON data where the ID matches the given value.
        Returns the record as a dictionary of key-value pairs.
        """
        transient_result = self.storage_lookup_one_by_id(self.transient, entity, id)
        if transient_result is not None:
            return transient_result
        return self.storage_lookup_one_by_id(self.data, entity, id)


    def lookup_one_by_field_json(self, entity: str, field: str, value: str):
        """
        Fetch a single record from the in-memory JSON data where the field matches the given value.
        Returns the record as a dictionary of key-value pairs.
        """
        transient_result = self.storage_lookup_one_by_field(self.transient,  entity, field, value)
        if transient_result is not None:
            return transient_result
        return self.storage_lookup_one_by_field(self.data, entity, field, value)

    def lookup_many_by_field_json(self, entity: str, field: str, value: str):
        """
        Fetch multiple records from the in-memory JSON data where the field matches the given value.
        Returns the records as a list of dictionaries.
        """
        transient_result = self.storage_lookup_many_by_field(self.transient, field, value)
        data_result = self.storage_lookup_many_by_field(self.data, entity, field, value)
        if transient_result is not None:
            data_result.extend(transient_result)
        return data_result

    def upsert_one_json(self, entity: str, id: str, data: dict, use_transient: bool = False):
        """
        Insert or update a record in the in-memory JSON data based on the fields in the data dictionary.
        If the ID is None or an empty string, a new unique ID is generated.
        Returns the ID of the upserted record.
        """
        if use_transient:
            # Use the transient storage for upsert
            return self.storage_upsert_one(self.transient, entity, id, data)
            
        
        id = self.storage_upsert_one(self.data, entity, id, data)

        if self.use_predefined_json:
            # Save the updated data to the file
            with open("data.json", "w") as f:
                json.dump(self.data, f, indent=4)

        return id

# create static version of GenericDataProvider
saved_data = GenericDataProvider()

# return static version of GenericDataProvider so it can be imported
def get_data_api() -> GenericDataProvider:
    return saved_data