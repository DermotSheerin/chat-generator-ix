pipeline {
    agent { dockerfile true }
    stages {
        stage('Test') {
            steps {
				sh 'docker.build('chatgenerator')'
				sh 'chmod 777 deploy.sh'
				sh './deploy.sh'
            }
        }
    }
}