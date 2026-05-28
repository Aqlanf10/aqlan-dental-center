using System.Net;
using System.Security;
using System.Text.Json;
using AqlanDental.Domain.Exceptions;

namespace AqlanDental.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message, code) = exception switch
        {
            DomainException domainEx => (
                HttpStatusCode.BadRequest,
                domainEx.Message,
                domainEx.Code),

            UnauthorizedAccessException => (
                HttpStatusCode.Unauthorized,
                "غير مصرح بالوصول",
                "UNAUTHORIZED"),

            SecurityException => (
                HttpStatusCode.Unauthorized,
                exception.Message,
                "SECURITY_VIOLATION"),

            InvalidOperationException => (
                HttpStatusCode.BadRequest,
                "حدث خطأ في العملية المطلوبة",
                "INVALID_OPERATION"),

            KeyNotFoundException => (
                HttpStatusCode.NotFound,
                "المورد المطلوب غير موجود",
                "NOT_FOUND"),

            _ => (
                HttpStatusCode.InternalServerError,
                "حدث خطأ داخلي في الخادم",
                "INTERNAL_ERROR")
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "حدث خطأ غير متوقع");
        }
        else
        {
            _logger.LogWarning(exception, "طلب غير صالح: {Message}", exception.Message);
        }

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";

        var response = new
        {
            StatusCode = (int)statusCode,
            Message = message,
            Code = code,
            Timestamp = DateTime.UtcNow.ToString("O")
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
