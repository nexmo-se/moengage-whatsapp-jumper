# for latest docker image run "npm run docker" 

export PROJECT_ID=jumper-147806-eu
export REGION=europe-west3
export SERVICENAME=moengage-eu

gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICENAME --project=$PROJECT_ID