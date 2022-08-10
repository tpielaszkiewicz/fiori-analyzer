using my.bookshop as my from '../db/data-model';

using { zorders00 } from './external/zorders00.csn';

using { consolidated as Consolidated } from './external/consolidated.csn';

service AnalyzeService
{
    @readonly
    entity Orders as projection on zorders00.Orders {
        key OrderId, Customer, Description, CreateDate
    };

    function runAnalyse
    (
        package : String,
        system : String
    )
    returns String;
}
