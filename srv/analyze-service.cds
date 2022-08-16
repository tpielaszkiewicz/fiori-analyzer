using {zbtp_fiori_analyzer_srv as backend} from './external/zbtp_fiori_analyzer_srv.csn';
using {com.pg.xa.fiorianalyzer.db as fiorianalyzerdb} from '../db/schema';

service AnalyzeService @(requires : ['EndUser']) {
    @readonly @cds.odata.valuelist
    entity CustomPackages  {
        key Package : String @(
                title       : '{i18n>Package}',
                description : '{i18n>PackageDescription}'
            );
        key System    : String(3) @(
                title       : '{i18n>System}',
                description : '{i18n>SystemDescription}'
            ); 
            Description : String @(
                title       : '{i18n>Package}',
                description : '{i18n>PackageDescription}'
            );
            
    } actions {
        action runPackageAnalyse() returns String;
    };

   

    entity Applications {
        key AppName   : String @(
                title       : '{i18n>Application}',
                description : '{i18n>ApplicationDescription}'
            );
        key System    : String(3) @(
                title       : '{i18n>System}',
                description : '{i18n>SystemDescription}'
            );
            Package   : String @(
                title       : '{i18n>Package}',
                description : '{i18n>PackageDescription}'
            );
            CreatedBy : String @(
                title       : '{i18n>CreatedBy}',
                description : '{i18n>CreatedByDescription}'
            );
            CreatedOn : Date @(
                title       : '{i18n>CreatedOn}',
                description : '{i18n>CreatedOnDescription}'
            );
    } actions {
        action runApplicationAnalyse() returns String;
    };

    @readonly  @cds.odata.valuelist
    entity Systems  as projection on fiorianalyzerdb.Systems;

    @readonly  
    entity AnalyseJobs  as projection on fiorianalyzerdb.Systems;

    @readonly  
    entity AnalyseJobPages  as projection on fiorianalyzerdb.Systems;

    @readonly  
    entity AnalyseResults  as projection on fiorianalyzerdb.Systems;

    function runAnalyse(package : String, system : String) returns String;
}
