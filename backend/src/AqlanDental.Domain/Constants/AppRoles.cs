namespace AqlanDental.Domain.Constants;

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Doctor = "Doctor";
    public const string Reception = "Reception";
    public const string Accountant = "Accountant";
    public const string Patient = "Patient";

    public static readonly string[] AllRoles = { Admin, Doctor, Reception, Accountant, Patient };
}
