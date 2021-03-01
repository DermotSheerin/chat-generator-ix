pipeline {
    agent { dockerfile true }

    stages {
        stage('Test') {
            steps {
				script {
	               def build = docker.build(chatgenerator)
	          }
				build
				sh 'chmod 777 deploy.sh'
				sh './deploy.sh'
            }
        }
    }
}