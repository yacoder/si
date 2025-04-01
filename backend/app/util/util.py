import argparse
import logging
import string
import sys
import time
import uuid
import random


DEFAULT_NUMBER_OF_ROUNDS = 8

def setup_logger():
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s',  # noqa
        stream = sys.stdout
    )

def generate_id():
    if ArgConfig.is_dev():
        return DevIdGenerator.generate_id()
    return str(uuid.uuid4())

def generate_token():
    if ArgConfig.is_dev():
        return DevIdGenerator.generate_token()
    return ''.join(random.choices(string.ascii_uppercase, k=5))


class DevIdGenerator:
    id = 1
    token = 10000

    @staticmethod
    def generate_id():
        DevIdGenerator.id += 1
        return str(DevIdGenerator.id)

    @staticmethod
    def generate_token():
        DevIdGenerator.token += 1
        return str(DevIdGenerator.token)

class ArgConfig:
    """Static class to hold references to all argument parameters."""

    # Static variables initialized as placeholders
    ENV = None
    USE_PREDEFINED_JSON = False
    IS_LOADED = False

    @staticmethod
    def load_args():
        if ArgConfig.IS_LOADED:
            return
        """Parse and load command-line arguments."""
        parser = argparse.ArgumentParser(description="Parse command-line arguments.")

        # Define the arguments
        parser.add_argument("--env", type=str, default="prod", help="Specify the environment")
        parser.add_argument("--env_use_predefined_json", type=bool, default="false", help="Specify save path")

        # Parse the arguments
        args = parser.parse_args()

        # Assign to static variables
        ArgConfig.ENV = args.env if 'env' in args else 'prod'
        env_use_predefined_json = True if 'env_use_predefined_json' in args else False
        ArgConfig.USE_PREDEFINED_JSON = env_use_predefined_json
        ArgConfig.IS_LOADED = True

    @staticmethod
    def is_dev():
        ArgConfig.load_args()
        return ArgConfig.ENV == 'dev'

    @staticmethod
    def is_env_use_predefined_json():
        ArgConfig.load_args()
        return ArgConfig.USE_PREDEFINED_JSON



def to_dict(obj):
    """Recursively converts an object to a dictionary."""
    if isinstance(obj, dict):
        # If the object is already a dictionary, process its items
        return {key: to_dict(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        # If the object is a list, process each element
        return [to_dict(item) for item in obj]
    elif hasattr(obj, "__dict__"):
        # If the object is a custom object, use its __dict__ attribute
        result = {}
        for key, value in obj.__dict__.items():
            if hasattr(value, "__dict__"):
                result[key] = value.__dict__
            else:
                result[key] = value
        return result
    else:
        # Base case: return the object as is (e.g., primitive types)
        return obj

def now():
    return time.time_ns() / 1000000
