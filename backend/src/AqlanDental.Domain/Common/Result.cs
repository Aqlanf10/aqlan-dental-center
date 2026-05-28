namespace AqlanDental.Domain.Common;

public class Result
{
    public bool IsSuccess { get; }
    public string? Error { get; }
    public string? Code { get; }

    protected Result(bool isSuccess, string? error, string? code)
    {
        IsSuccess = isSuccess;
        Error = error;
        Code = code;
    }

    public static Result Success() => new(true, null, null);
    public static Result Failure(string code, string error) => new(false, error, code);

    public static Result<T> Success<T>(T value) => new(value, true, null, null);
    public static Result<T> Failure<T>(string code, string error) => new(default, false, error, code);
}

public class Result<T> : Result
{
    private readonly T? _value;

    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Cannot access value of a failed result.");

    internal Result(T? value, bool isSuccess, string? error, string? code)
        : base(isSuccess, error, code)
    {
        _value = value;
    }
}
