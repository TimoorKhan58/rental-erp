export interface Success<T> {
  success: true;
  value: T;
}

export interface Failure<E> {
  success: false;
  error: E;
}

export type Result<T, E = Error> = Success<T> | Failure<E>;

export function success<T>(value: T): Success<T> {
  return {
    success: true,
    value,
  };
}

export function failure<E>(error: E): Failure<E> {
  return {
    success: false,
    error,
  };
}

export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success;
}

export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.success;
}
