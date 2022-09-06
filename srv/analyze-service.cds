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
    } 

    entity ApplicationPages {
        key AppName : String @(
                title       : '{i18n>AppName}',
                description : '{i18n>AppNameDescription}'
            );
        key PageName : String @(
                title       : '{i18n>PageName}',
                description : '{i18n>PageNameDescription}'
            );
        key System : String(3) @(
                title       : '{i18n>System}',
                description : '{i18n>SystemDescription}'
            );
            PageKey : String @(
                title       : '{i18n>PageKey}',
                description : '{i18n>PageKeyDescription}'
            );
            PageContent : String @(
                title       : '{i18n>PageContent}',
                description : '{i18n>PageContentDescription}'
            );

    }
    
    entity Applications {
        key AppName   : String @(
                title       : '{i18n>Application}',
                description : '{i18n>ApplicationDescription}'
            );
        key System    : String(3) @(
                title       : '{i18n>System}',
                description : '{i18n>SystemDescription}'
            );
            Description : String @(
                title       : '{i18n>Application}',
                description : '{i18n>ApplicationDescription}'
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
    } 

    entity AnalysedAppsSummary {
        key System : String(3) @(
                title       : '{i18n>System}',
                description : '{i18n>SystemDescription}'
            );
        key job : Association to AnalyseJobs;
            // Only for easier usage 
            AnalyseDate: Timestamp @( 
                title       : '{i18n>AnalyseDate}',
                description : '{i18n>AnalyseDateDescription}'
            );
            TotalApps:  Integer @(
                title       : '{i18n>TotalApps}',
                description : '{i18n>TotalApps}'
            );
            CorrectApps:   Integer @(
                title       : '{i18n>CorrectApps}',
                description : '{i18n>CorrectAppsDescription}'
            );
            FailedApps:  Integer @(
                title       : '{i18n>FailedApps}',
                description : '{i18n>FailedAppsDescription}'
            );
            WarningApps:  Integer @(
                title       : '{i18n>WarningApps}',
                description : '{i18n>WarningAppsDescription}'
            );
    }

    @readonly  @cds.odata.valuelist
    entity Systems  as projection on fiorianalyzerdb.Systems;
  
     
    entity AnalyseJobs  as projection on fiorianalyzerdb.AnalyseJobs 
    actions {
        action runAnalyseJob() returns String;
    }; 

    extend projection AnalyseJobs with {
        analysedApps: Association to many AnalyseJobApps on analysedApps.job = $self
    }

    entity AnalyseJobApps {
        key AppName : String @(
                title       : '{i18n>System}',
                description : '{i18n>SystemDescription}'
            );
        key job : Association to AnalyseJobs;
        JobAnalyseDate: Date @(
                title       : '{i18n>PreviousRunDate}',
                description : '{i18n>PreviousRunDateDescription}'
            );
        System : String(3) @(
                title       : '{i18n>System}',
                description : '{i18n>SystemDescription}'
            );
        Package   : String @(
                title       : '{i18n>Package}',
                description : '{i18n>PackageDescription}'
            );
        NoOfErrors :  Integer @(
                title       : '{i18n>NoOfErrors}',
                description : '{i18n>NoOfErrorsDescription}'
            );
        NoOfPrevErrors: Integer @(
                title       : '{i18n>NoOfErrorsTrend}',
                description : '{i18n>NoOfErrorsTrendDescription}'
            );
        NoOfWarnings :  Integer @(
                title       : '{i18n>NoOfWarnings}',
                description : '{i18n>NoOfWarningsDescription}'
            );
        NoOfPrevWarnings: Integer @(
                title       : '{i18n>NoOfErrorsTrend}',
                description : '{i18n>NoOfErrorsTrendDescription}'
            );
        PreviousJobID: UUID @(
                title       : '{i18n>PreviousRunDate}',
                description : '{i18n>PreviousRunDateDescription}'
            );
		PreviousRunDate: Date @(
                title       : '{i18n>PreviousRunDate}',
                description : '{i18n>PreviousRunDateDescription}'
            );
		IsLastAppRun: Boolean @(
                title       : '{i18n>IsLastAppRun}',
                description : '{i18n>IsLastAppRunDescription}'
            );
        appResults: Association to many AnalyseAppResults on appResults.job = $self;  
        
    }

    entity AnalyseAppResults {
        key messageId : UUID @(
                title       : '{i18n>MessageID}',
                description : '{i18n>MessageIDDescription}'
            );
        pageName: String @(
                title       : '{i18n>PageName}',
                description : '{i18n>PageNameDescription}'
            );
        message : String @(
                title       : '{i18n>Message}',
                description : '{i18n>MessageDescription}'
            );
        severity: Association to Severity @(
                title       : '{i18n>Severity}',
                description : '{i18n>SeverityDescription}'
         );
        column : Integer @(
            title       : '{i18n>Column}',
            description : '{i18n>ColumnDescription}'
        );
        row : Integer @(
            title       : '{i18n>Row}',
            description : '{i18n>RowDescription}'
        );
        rule: String @(
            title       : '{i18n>Rule}',
            description : '{i18n>RuleDescription}'
        );
        job : Association to AnalyseJobApps; 
    }
   
    @readonly  
    entity AnalyseJobObjects  as projection on fiorianalyzerdb.AnalyseJobObjects; 
 
    @readonly  
    entity Severity  as projection on fiorianalyzerdb.Severity; 

    @readonly
    entity JobObjectTypes as projection on fiorianalyzerdb.JobObjectType; 

    function getLastJobId(System: String) returns UUID;
}

annotate AnalyzeService.Systems @(
    Capabilities:{
        InsertRestrictions:{Insertable: true},
        UpdateRestrictions:{Updatable: true},
        DeleteRestrictions:{Deletable: true}
    }
);

annotate AnalyzeService.AnalyseJobs with @(Capabilities:{
        InsertRestrictions:{Insertable: true},
        UpdateRestrictions:{Updatable: false},
        DeleteRestrictions:{Deletable: true}
    }
) {
    status @readonly
};

annotate AnalyzeService.AnalyseJobObjects @(
    Capabilities:{
        InsertRestrictions:{Insertable: true},
        UpdateRestrictions:{Updatable: false},
        DeleteRestrictions:{Deletable: false}
    }
);

annotate AnalyzeService.AnalyseResults @(
    Capabilities:{
        InsertRestrictions:{Insertable: false},
        UpdateRestrictions:{Updatable: false},
        DeleteRestrictions:{Deletable: false}
    }
);

annotate AnalyzeService.AnalyseJobPages @(
    Capabilities:{
        InsertRestrictions:{Insertable: false},
        UpdateRestrictions:{Updatable: false},
        DeleteRestrictions:{Deletable: false}
    }
);