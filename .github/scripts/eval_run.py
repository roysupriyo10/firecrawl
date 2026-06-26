import requests
import argparse
import sys
import time

MAX_ATTEMPTS = 3
BACKOFF_SECONDS = (5, 15)
REQUEST_TIMEOUT_SECONDS = 30


def post_eval_run(args, post=requests.post, sleep=time.sleep):
    last_error = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return post(
                f"{args.api_url}/run",
                json={
                    "experiment_id": args.experiment_id,
                    "api_key": args.api_key,
                    "label": args.label
                },
                headers={
                    "Content-Type": "application/json"
                },
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            last_error = e
            if attempt == MAX_ATTEMPTS:
                break

            delay = BACKOFF_SECONDS[attempt - 1]
            print(
                f"Eval API request failed on attempt {attempt}/{MAX_ATTEMPTS}: {e}. "
                f"Retrying in {delay}s...",
                file=sys.stderr,
            )
            sleep(delay)

    raise last_error


def main():
    parser = argparse.ArgumentParser(description='Run evaluation benchmark')
    parser.add_argument('--label', required=True, help='Label for the evaluation run')
    parser.add_argument('--api-url', required=True, help='API URL')
    parser.add_argument('--api-key', required=True, help='API key')
    parser.add_argument('--experiment-id', required=True, help='Experiment ID')

    args = parser.parse_args()

    try:
        response = post_eval_run(args)

        response.raise_for_status()

        print("Evaluation run started successfully")
        print(f"Response: {response.json()}")

    except requests.exceptions.RequestException as e:
        print(f"Error running evaluation: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
