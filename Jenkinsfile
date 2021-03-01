pipeline {
    agent { dockerfile true }
    stages {
        stage('Test') {
            steps {
				sh 'docker ps -a'
				sh './deploy.sh'
            }
        }
    }
}