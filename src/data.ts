const TData = new Map<number, any>();
export const TDATA = {
    get: (number: number) => TData.get(number),
    query: (number: number) => {
        if (!TData.has(number)) TData.set(number, {});
        return TData.get(number);
    }
}
