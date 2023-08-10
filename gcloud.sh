# for latest docker image run "npm run docker" 

export PROJECT_ID=jumperdevnew                                                  
export REGION=us-central1
export SERVICENAME=moengage

gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICENAME --project=$PROJECT_ID