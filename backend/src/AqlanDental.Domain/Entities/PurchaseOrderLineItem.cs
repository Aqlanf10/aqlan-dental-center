namespace AqlanDental.Domain.Entities;

public class PurchaseOrderLineItem
{
    public Guid Id { get; set; }
    public Guid PurchaseOrderId { get; set; }
    public Guid? InventoryItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int ReceivedQuantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost { get; set; }
    public bool IsActive { get; set; } = true;

    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public InventoryItem? InventoryItem { get; set; }
}
