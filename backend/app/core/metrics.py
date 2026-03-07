import time


api_call_count = 0

def increment_api_calls():
    global api_call_count
    api_call_count += 1

def get_api_calls():
    return api_call_count


api_call_count = 0
total_response_time = 0
error_count = 0


def record_request(response_time, is_error=False):
    global api_call_count, total_response_time, error_count

    api_call_count += 1
    total_response_time += response_time

    if is_error:
        error_count += 1


def get_metrics():
    avg_response = 0
    error_rate = 0

    if api_call_count > 0:
        avg_response = total_response_time / api_call_count
        error_rate = (error_count / api_call_count) * 100

    return {
        "total_api_calls": api_call_count,
        "avg_response_time": round(avg_response * 1000, 2),  # ms
        "error_rate": round(error_rate, 2)
    }