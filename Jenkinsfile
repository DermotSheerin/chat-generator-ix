pipeline {
    agent { dockerfile true }
    stages {
	    stage('Build') {
            steps {
                echo 'Building Image ....'
            }
        }
		
        stage('Test') {
            steps {
                sh 'node --version'
            }
        }
		
		stage('Deploy') {
            steps {
                echo 'Deploying and running script ....'
				sh "chmod +x -R ${env.WORKSPACE}"
				sh './runDocker.sh'
            }
        }
    }
}