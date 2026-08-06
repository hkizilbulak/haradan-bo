import { PagedResponse, SearchParams } from '@/models/common';
import { useState, useEffect } from 'react';

type SearchableService<T> = {
    search: (params: SearchParams<T>) => Promise<PagedResponse<T>>;
}

type IProps<T> = {
    service: SearchableService<T>,
    params?: SearchParams<T>;
}

const initialParameters = {
    filter: 'status==ACTIVE',
    pageRequest: {
        page: 0,
        size: 10,
        sort: [{ direction: 'DESC', property: 'createdDate' }],
    }
} as any;

const useApi = <T>({ service, params = initialParameters as SearchParams<T> }: IProps<T>) => {
    const [data, setData] = useState<PagedResponse<T>>();
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [isRefetch, setIsRefetch] = useState(false)
    const [parameters, setParameters] = useState<SearchParams<T>>(params);

    const refetch = () => setIsRefetch(!isRefetch)


    const handleFilter = (filter: string) => {
        setParameters({
            ...parameters,
            filter
        })
    }

    const handlePageChange = (page: number) => {
        setParameters({
            ...parameters,
            pageRequest: {
                ...parameters.pageRequest,
                page: page
            }
        })
    }

    useEffect(() => {
        const fetchData = async () => {
            setIsError(false);
            setIsLoading(true);

            try {
                const response = await service.search(parameters);
                setData(response)
            } catch (error) {
                setIsError(true);
            }

            setIsLoading(false);
        };

        fetchData();
    }, [parameters, isRefetch]);

    return [{ data, parameters, isLoading, isError, handleFilter, handlePageChange, setParameters, refetch }];
}

export default useApi;
