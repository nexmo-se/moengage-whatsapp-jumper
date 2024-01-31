# for latest docker image run "npm run docker" 

export PROJECT_ID=jumper-147806
export REGION=us-central1
export SERVICENAME=moengage-us

gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICENAME --project=$PROJECT_ID