namespace AqlanDental.Domain.Constants;

public static class ServiceTypes
{
    public const string Orthodontics = "تقويم الأسنان";
    public const string Implants = "زراعة الأسنان";
    public const string Cosmetic = "تجميل الأسنان";
    public const string General = "علاج الأسنان العام";
    public const string OralSurgery = "جراحة الفم";

    public static readonly string[] All = { Orthodontics, Implants, Cosmetic, General, OralSurgery };
}
