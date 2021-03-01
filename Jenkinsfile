pipeline {
    agent { dockerfile true }
    stages {
        stage('Test') {
            steps {
				sh 'docker ps -a'
				sh 'chmod 777 deploy.sh'
				sh 'which docker-compose'
            }
        }
    }
}