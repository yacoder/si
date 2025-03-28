def validate_record_for_mandatory_fields(record, mandatory_fields):
    """
    Validate if the provided record contains all mandatory fields.
    
    Args:
        record (dict): The record to validate.
        mandatory_fields (list): List of mandatory field names.
    
    Returns:
        bool: True if all mandatory fields are present, False otherwise.
    """
    for field in mandatory_fields:
        if field not in record or not record[field]:
            return False
    return True