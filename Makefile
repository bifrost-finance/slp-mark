REPO=harbor.liebi.com/slp
BUILD_VERSION   := $(shell git log -1 --pretty='%h')
NAMESPACE := slp

IMAGE=${REPO}/slp-mark:${BUILD_VERSION}

build:
	docker build -f Dockerfile -t ${IMAGE} .
	docker push ${IMAGE}
	
create-cm:
	kubectl create configmap slp-mark-env --from-file=.env=.env -n ${NAMESPACE}

update: build
	kubectl set image deploy -n ${NAMESPACE} slp-mark  slp-mark=${IMAGE}
	kubectl  rollout restart deploy -n ${NAMESPACE} slp-mark 

version:
	echo "code version",${BUILD_VERSION}




