pipeline {
    agent { dockerfile true }
	script {
	     def build = docker.build(chatgenerator)
	}
    stages {
        stage('Test') {
            steps {
				build
				sh 'chmod 777 deploy.sh'
				sh './deploy.sh'
            }
        }
    }
}