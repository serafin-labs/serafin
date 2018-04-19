export interface ResultsInterface<T, META extends {} = {}> {
    data: Array<T>
    meta: META
}
