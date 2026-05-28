using AqlanDental.Api.Extensions;
using AqlanDental.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApiServices(builder.Configuration);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Aqlan Dental Center API v1"));
    app.UseCors("DevCors");
}
else
{
    app.UseCors("ProductionCors");
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

await app.UseInfrastructureSeedAsync();

app.Run();

public partial class Program { }
