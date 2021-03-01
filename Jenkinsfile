pipeline {
    agent { dockerfile true }
    stages {
        stage('Test') {
            steps {
				sh 'docker-compose build'
				sh 'docker-compose up -d'
            }
        }
    }
}