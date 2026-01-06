// Reminder categories with Lucide React Native icons

export const REMINDER_CATEGORIES = {
    cheque: {
        id: 'cheque',
        name: 'Cheque',
        icon: 'Banknote', // Lucide icon name
        color: '#10B981',
        description: 'Collection or handout',
        fields: [
            { name: 'chequeType', label: 'Type', type: 'select', options: ['Collection', 'Handout'], required: true },
            { name: 'personName', label: 'Person/Business Name', type: 'text', required: true },
            { name: 'amount', label: 'Amount (Ksh)', type: 'number', required: true },
            { name: 'bankName', label: 'Bank Name', type: 'text', required: false },
            { name: 'chequeNumber', label: 'Cheque Number', type: 'text', required: false },
            { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
        ]
    },
    delivery: {
        id: 'delivery',
        name: 'Delivery Expected',
        icon: 'Truck', // Lucide icon name
        color: '#3B82F6',
        description: 'Track incoming deliveries',
        fields: [
            { name: 'supplierName', label: 'Supplier Name', type: 'text', required: true },
            { name: 'itemsExpected', label: 'Items Expected', type: 'textarea', required: true },
            { name: 'deliveryFee', label: 'Delivery Fee (Ksh)', type: 'number', required: false },
            { name: 'driverContact', label: 'Driver Contact', type: 'phone', required: false },
            { name: 'trackingNumber', label: 'Tracking Number', type: 'text', required: false },
            { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
        ]
    },
    customer: {
        id: 'customer',
        name: 'Customer Follow-up',
        icon: 'UserCheck', // Lucide icon name
        color: '#8B5CF6',
        description: 'Remember customer contacts',
        fields: [
            { name: 'customerName', label: 'Customer Name', type: 'text', required: true },
            { name: 'phoneNumber', label: 'Phone Number', type: 'phone', required: true },
            {
                name: 'followUpReason', label: 'Reason for Follow-up', type: 'select',
                options: ['Pending Order', 'Payment Due', 'Feedback Request', 'General Check-in', 'Other'],
                required: true
            },
            { name: 'lastContact', label: 'Last Contact Date', type: 'date', required: false },
            { name: 'orderDetails', label: 'Order/Reference Details', type: 'textarea', required: false },
            { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
        ]
    },
    supplier: {
        id: 'supplier',
        name: 'Supplier Payment',
        icon: 'PackageCheck', // Lucide icon name
        color: '#F59E0B',
        description: 'Track payments to suppliers',
        fields: [
            { name: 'supplierName', label: 'Supplier Name', type: 'text', required: true },
            { name: 'amountDue', label: 'Amount Due (Ksh)', type: 'number', required: true },
            { name: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: false },
            {
                name: 'paymentMethod', label: 'Payment Method', type: 'select',
                options: ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque'],
                required: false
            },
            { name: 'accountNumber', label: 'Account/Reference Number', type: 'text', required: false },
            { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
        ]
    },
    inventory: {
        id: 'inventory',
        name: 'Inventory Restock',
        icon: 'Package', // Lucide icon name
        color: '#EC4899',
        description: 'Restock inventory items',
        fields: [
            { name: 'inventoryItemId', label: 'Select Item from Inventory', type: 'inventory-select', required: true },
            { name: 'quantityNeeded', label: 'Quantity Needed', type: 'number', required: true },
            { name: 'supplierName', label: 'Supplier Name', type: 'text', required: true },
            { name: 'estimatedCost', label: 'Estimated Cost (Ksh)', type: 'number', required: false },
            {
                name: 'urgency', label: 'Urgency Level', type: 'select',
                options: ['Critical', 'High', 'Medium', 'Low'],
                required: false
            },
            { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
        ]
    },
    financial: {
        id: 'financial',
        name: 'Bank/Financial',
        icon: 'Landmark', // Lucide icon name
        color: '#06B6D4',
        description: 'Financial deadlines and tasks',
        fields: [
            {
                name: 'financialType', label: 'Type', type: 'select',
                options: ['Tax Payment', 'Report Submission', 'Bank Payment', 'License Renewal', 'Audit', 'Other'],
                required: true
            },
            { name: 'institution', label: 'Institution/Department', type: 'text', required: true },
            { name: 'amount', label: 'Amount (if applicable)', type: 'number', required: false },
            { name: 'referenceNumber', label: 'Reference Number', type: 'text', required: false },
            { name: 'documentRequired', label: 'Documents Required', type: 'textarea', required: false },
            { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
        ]
    },
};

// Icon mapping for dynamic imports
export const ICON_COMPONENTS = {
    'Banknote': 'Banknote',
    'Truck': 'Truck',
    'UserCheck': 'UserCheck',
    'PackageCheck': 'PackageCheck',
    'Package': 'Package',
    'Landmark': 'Landmark',
};

// Get category configuration
export const getCategory = (categoryId) => {
    return REMINDER_CATEGORIES[categoryId] || null;
};

// Get all categories as array
export const getAllCategories = () => {
    return Object.values(REMINDER_CATEGORIES);
};

// Get category name with icon name
export const getCategoryDisplay = (categoryId) => {
    const category = getCategory(categoryId);
    return category ? category.name : 'Unknown';
};

// Get category color
export const getCategoryColor = (categoryId) => {
    const category = getCategory(categoryId);
    return category ? category.color : '#6B7280';
};

// Get category icon name
export const getCategoryIcon = (categoryId) => {
    const category = getCategory(categoryId);
    return category ? category.icon : 'Bell';
};

// Format reminder data for display
export const formatReminderData = (reminder) => {
    if (!reminder || !reminder.data) return '';

    const category = getCategory(reminder.category);
    if (!category) return '';

    const data = reminder.data;
    let formatted = [];

    switch (reminder.category) {
        case 'cheque':
            formatted.push(`${data.chequeType || 'Cheque'} - ${data.personName || 'N/A'}`);
            if (data.amount) formatted.push(`Ksh ${Number(data.amount).toLocaleString()}`);
            if (data.bankName) formatted.push(data.bankName);
            if (data.chequeNumber) formatted.push(`#${data.chequeNumber}`);
            break;

        case 'delivery':
            formatted.push(data.supplierName || 'Supplier');
            if (data.itemsExpected) formatted.push(data.itemsExpected);
            if (data.deliveryFee) formatted.push(`Fee: Ksh ${Number(data.deliveryFee).toLocaleString()}`);
            break;

        case 'customer':
            formatted.push(data.customerName || 'Customer');
            if (data.phoneNumber) formatted.push(data.phoneNumber);
            if (data.followUpReason) formatted.push(data.followUpReason);
            break;

        case 'supplier':
            formatted.push(data.supplierName || 'Supplier');
            if (data.amountDue) formatted.push(`Ksh ${Number(data.amountDue).toLocaleString()}`);
            if (data.invoiceNumber) formatted.push(`Invoice: ${data.invoiceNumber}`);
            if (data.paymentMethod) formatted.push(data.paymentMethod);
            break;

        case 'inventory':
            formatted.push(data.inventoryItemName || 'Item');
            if (data.quantityNeeded) formatted.push(`Qty: ${data.quantityNeeded}`);
            if (data.supplierName) formatted.push(data.supplierName);
            if (data.estimatedCost) formatted.push(`Est: Ksh ${Number(data.estimatedCost).toLocaleString()}`);
            break;

        case 'financial':
            formatted.push(data.financialType || 'Financial');
            if (data.institution) formatted.push(data.institution);
            if (data.amount) formatted.push(`Ksh ${Number(data.amount).toLocaleString()}`);
            if (data.referenceNumber) formatted.push(`Ref: ${data.referenceNumber}`);
            break;
    }

    return formatted.join(' • ');
};