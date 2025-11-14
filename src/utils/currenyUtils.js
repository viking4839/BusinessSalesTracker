export const formatCurrency = (amount, currency = 'KSh') => {
    return `${currency} ${Math.abs(amount).toLocaleString('en-KE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
};

export const parseCurrency = (currencyString) => {
    return parseFloat(currencyString.replace(/[^0-9.-]+/g, ''));
};

export const calculatePercentage = (part, whole) => {
    if (whole === 0) return 0;
    return Math.round((part / whole) * 100);
};

export const calculateAverage = (numbers) => {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
};